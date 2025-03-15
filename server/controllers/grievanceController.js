import Petition from '../models/Petition.js';
import Official from '../models/Official.js';
import WebSocketService from '../services/WebSocketService.js';

let webSocketService;

export const initializeWebSocket = (io) => {
    webSocketService = new WebSocketService(io);
};

// Helper function to get the next available official using round-robin
const getNextAvailableOfficial = async (department, excludeOfficialId = null) => {
    try {
        // Get all officials from the department
        const officials = await Official.find({ department });

        if (!officials.length) {
            console.log(`No officials found in ${department} department`);
            return null;
        }

        // If we're reassigning (excludeOfficialId is provided), filter out that official
        const availableOfficials = excludeOfficialId
            ? officials.filter(off => off._id.toString() !== excludeOfficialId.toString())
            : officials;

        if (!availableOfficials.length) {
            console.log('No available officials for assignment');
            return null;
        }

        // Get the official with the least number of active grievances
        const officialLoads = await Promise.all(
            availableOfficials.map(async (official) => {
                const activeGrievances = await Petition.countDocuments({
                    assignedOfficer: official._id,
                    status: { $in: ['Pending', 'Assigned', 'In Progress'] }
                });
                return { official, activeGrievances };
            })
        );

        // Sort by number of active grievances
        officialLoads.sort((a, b) => a.activeGrievances - b.activeGrievances);

        return officialLoads[0].official;
    } catch (error) {
        console.error('Error finding next available official:', error);
        return null;
    }
};

// Create a new grievance and make it visible to all department officials
export const createGrievance = async (req, res) => {
    try {
        console.log('Creating grievance with body:', req.body);
        console.log('File:', req.file);
        console.log('User:', req.user);

        if (!req.user?.id) {
            return res.status(401).json({
                message: 'User not authenticated'
            });
        }

        // Validate required fields
        const requiredFields = ['department', 'subject', 'description', 'expectedResolution'];
        const missingFields = requiredFields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Validate description length
        if (req.body.description.length < 50) {
            return res.status(400).json({
                message: 'Description must be at least 50 characters long'
            });
        }

        // Parse and validate expected resolution date
        const expectedResolution = new Date(req.body.expectedResolution);
        if (isNaN(expectedResolution.getTime())) {
            return res.status(400).json({
                message: 'Invalid expected resolution date'
            });
        }

        if (expectedResolution < new Date()) {
            return res.status(400).json({
                message: 'Expected resolution date must be in the future'
            });
        }

        // Create grievance object
        const grievanceData = {
            petitioner: req.user.id,
            department: req.body.department,
            subject: req.body.subject,
            description: req.body.description,
            priority: req.body.priority || 'Medium',
            expectedResolution: expectedResolution,
            status: 'Pending',
            dateFiled: new Date(),
            assignmentHistory: []
        };

        // Add file path if a file was uploaded
        if (req.file) {
            // Convert Windows path to URL-friendly format
            const filePath = req.file.path.replace(/\\/g, '/');
            grievanceData.file = filePath;
        }

        console.log('Creating grievance with data:', grievanceData);

        // Create and save the grievance
        const grievance = new Petition(grievanceData);
        await grievance.save();

        console.log('Grievance created successfully:', grievance);

        // Notify department officials through WebSocket
        if (webSocketService) {
            webSocketService.notifyNewGrievance(grievance.department, {
                grievanceId: grievance._id,
                title: grievance.subject,
                department: grievance.department,
                status: 'Pending'
            });
        } else {
            console.warn('WebSocket service not initialized');
        }

        res.status(201).json({
            message: 'Grievance created successfully',
            grievance: grievance
        });
    } catch (error) {
        console.error('Error creating grievance:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            message: 'Error creating grievance',
            error: error.message
        });
    }
};

// Handle official's response to assignment (accept/decline)
export const handleAssignmentResponse = async (req, res) => {
    try {
        const { grievanceId } = req.params;
        const { accept } = req.body;
        const officialId = req.user.id;

        const grievance = await Petition.findById(grievanceId);
        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        // Get official details
        const official = await Official.findById(officialId);
        if (!official) {
            return res.status(404).json({ message: 'Official not found' });
        }

        // Check if grievance is already assigned
        if (grievance.status !== 'Pending') {
            return res.status(400).json({
                message: 'This grievance has already been assigned to another official'
            });
        }

        if (accept) {
            // Update grievance status and assign to the accepting official
            grievance.status = 'Assigned';
            grievance.assignedOfficer = officialId;
            grievance.assignmentHistory.push({
                official: officialId,
                status: 'Accepted',
                timestamp: new Date()
            });

            console.log(`Official [${official.firstName} ${official.lastName}] accepted Grievance ID [${grievanceId}]`);

            // Notify all officials in the department about the assignment
            if (webSocketService) {
                webSocketService.notifyGrievanceUpdate(grievance.department, {
                    type: 'GRIEVANCE_ASSIGNED',
                    grievanceId: grievance._id,
                    title: grievance.subject,
                    department: grievance.department,
                    status: 'Assigned',
                    assignedTo: `${official.firstName} ${official.lastName}`
                });

                // Notify the petitioner about the assignment
                webSocketService.notifyPetitioner(grievance.petitioner, {
                    type: 'GRIEVANCE_ASSIGNED',
                    grievanceId: grievance._id,
                    message: `Your grievance (ID: ${grievanceId}) has been assigned to ${official.firstName} ${official.lastName}. You can now chat with them.`,
                    officialName: `${official.firstName} ${official.lastName}`
                });
            }

            await grievance.save();

            res.json({
                message: 'Grievance accepted successfully',
                grievance
            });
        } else {
            // Handle decline - find next available official
            const nextOfficial = await getNextAvailableOfficial(grievance.department, officialId);

            if (!nextOfficial) {
                return res.status(400).json({
                    message: 'No other officials available to handle this grievance'
                });
            }

            // Log the decline and reassignment
            console.log(`Official [${official.firstName} ${official.lastName}] declined Grievance ID [${grievanceId}]. Reassigning to [${nextOfficial.firstName} ${nextOfficial.lastName}]`);

            // Update assignment history
            grievance.assignmentHistory.push({
                official: officialId,
                status: 'Declined',
                timestamp: new Date()
            });

            // Notify officials about the reassignment
            if (webSocketService) {
                webSocketService.notifyGrievanceUpdate(grievance.department, {
                    type: 'GRIEVANCE_REASSIGNED',
                    grievanceId: grievance._id,
                    title: grievance.subject,
                    department: grievance.department,
                    status: 'Pending',
                    message: `Grievance reassigned to ${nextOfficial.firstName} ${nextOfficial.lastName}`
                });
            }

            await grievance.save();

            res.json({
                message: 'Grievance declined and reassigned successfully',
                grievance
            });
        }
    } catch (error) {
        console.error('Error handling assignment response:', error);
        res.status(500).json({ message: 'Error handling assignment response', error: error.message });
    }
};

// Update grievance status
export const updateGrievanceStatus = async (req, res) => {
    try {
        const { grievanceId } = req.params;
        const { status } = req.body;
        const officialId = req.user.id;

        const grievance = await Petition.findById(grievanceId);
        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        // Verify the official is assigned to this grievance
        if (grievance.assignedOfficer.toString() !== officialId) {
            return res.status(403).json({ message: 'Not authorized to update this grievance' });
        }

        // Update status
        grievance.status = status;
        if (status === 'Resolved') {
            grievance.resolutionDate = new Date();
            grievance.assignmentHistory.push({
                official: officialId,
                status: 'Completed'
            });
        }

        await grievance.save();

        console.log(`Grievance ID [${grievanceId}] status updated to: ${status} by Official [${req.user.firstName} ${req.user.lastName}]`);

        // Notify relevant parties
        webSocketService.notifyStatusUpdate(grievance.petitioner, 'petitioner', {
            grievanceId: grievance._id,
            status: grievance.status
        });

        res.json({
            message: 'Grievance status updated successfully',
            grievance
        });
    } catch (error) {
        console.error('Error updating grievance status:', error);
        res.status(500).json({ message: 'Error updating grievance status', error: error.message });
    }
};

// Get grievances for an official
export const getOfficialGrievances = async (req, res) => {
    try {
        const { officialId } = req.params;
        const { department } = req.user;

        console.log(`Fetching grievances for official ${officialId} in ${department} department`);

        // Find all grievances for the department
        const allGrievances = await Petition.find({
            department,
            $or: [
                { status: 'Pending' }, // All pending grievances in the department
                { assignedOfficer: officialId } // All grievances assigned to this official
            ]
        })
            .populate('petitioner', 'firstName lastName email')
            .populate('assignedOfficer', 'firstName lastName email')
            .sort({ dateFiled: -1 });

        console.log(`Found ${allGrievances.length} total grievances`);

        // Format grievances and organize by status
        const formattedGrievances = {
            pending_acceptance: [],
            assigned: [],
            inProgress: [],
            resolved: [],
            closed: []
        };

        allGrievances.forEach(grievance => {
            const g = grievance.toObject();

            // Add assignedOfficerName if present
            if (g.assignedOfficer) {
                g.assignedOfficerName = `${g.assignedOfficer.firstName} ${g.assignedOfficer.lastName}`;
            }

            // Add petitionerName
            if (g.petitioner) {
                g.petitionerName = `${g.petitioner.firstName} ${g.petitioner.lastName}`;
            }

            // Map backend status to frontend status
            switch (g.status) {
                case 'Pending':
                    formattedGrievances.pending_acceptance.push(g);
                    break;
                case 'Assigned':
                    formattedGrievances.assigned.push(g);
                    break;
                case 'In Progress':
                    formattedGrievances.inProgress.push(g);
                    break;
                case 'Resolved':
                    formattedGrievances.resolved.push(g);
                    break;
                case 'Rejected':
                    formattedGrievances.closed.push(g);
                    break;
                default:
                    console.log(`Unhandled status: ${g.status} for grievance ${g._id}`);
                    formattedGrievances.pending_acceptance.push(g);
            }
        });

        // Log counts for debugging
        Object.entries(formattedGrievances).forEach(([status, items]) => {
            console.log(`${status} count:`, items.length);
            if (items.length > 0) {
                console.log(`Sample ${status} grievance:`, {
                    id: items[0]._id,
                    subject: items[0].subject,
                    status: items[0].status,
                    department: items[0].department
                });
            }
        });

        res.json(formattedGrievances);
    } catch (error) {
        console.error('Error fetching official grievances:', error);
        res.status(500).json({ message: 'Error fetching grievances', error: error.message });
    }
};

// Get grievances by department
export const getGrievancesByDepartment = async (req, res) => {
    try {
        const { department } = req.params;
        const officialId = req.user.id;

        console.log(`Fetching grievances for department ${department}, official ${officialId}`);

        // Verify the official belongs to the requested department
        if (req.user.department !== department) {
            return res.status(403).json({ message: 'Not authorized to view grievances from this department' });
        }

        // Find all grievances for the department
        const grievances = await Petition.find({
            department,
            $or: [
                { status: 'Pending' }, // Show all pending grievances
                { assignedOfficer: officialId } // Show only assigned grievances for this official
            ]
        })
            .populate('petitioner', 'firstName lastName email')
            .populate('assignedOfficer', 'firstName lastName email')
            .sort({ dateFiled: -1 });

        console.log(`Found ${grievances.length} grievances for department ${department}`);

        // Log counts by status
        const counts = {
            pending: grievances.filter(g => g.status === 'Pending').length,
            assigned: grievances.filter(g => g.status === 'Assigned' && g.assignedOfficer?._id.toString() === officialId).length,
            inProgress: grievances.filter(g => g.status === 'In Progress' && g.assignedOfficer?._id.toString() === officialId).length,
            resolved: grievances.filter(g => g.status === 'Resolved' && g.assignedOfficer?._id.toString() === officialId).length
        };

        console.log('Grievance counts:', counts);

        // Format grievances for frontend
        const formattedGrievances = grievances.map(grievance => {
            const g = grievance.toObject();
            if (g.assignedOfficer) {
                g.assignedOfficerName = `${g.assignedOfficer.firstName} ${g.assignedOfficer.lastName}`;
                // Ensure _id is included in the assignedOfficer object
                g.assignedOfficer = {
                    _id: g.assignedOfficer._id.toString(),
                    firstName: g.assignedOfficer.firstName,
                    lastName: g.assignedOfficer.lastName,
                    email: g.assignedOfficer.email
                };
            }
            return g;
        });

        res.json(formattedGrievances);
    } catch (error) {
        console.error('Error fetching department grievances:', error);
        res.status(500).json({ message: 'Error fetching grievances', error: error.message });
    }
}; 