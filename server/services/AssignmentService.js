import Official from '../models/Official.js';
import Petition from '../models/Petition.js';

class AssignmentService {
    static async getNextAvailableOfficial(department) {
        try {
            // Get all active officials in the department, sorted by last assignment date
            const officials = await Official.find({
                department,
                isActive: true,
                status: 'Available'
            }).sort({ lastAssignmentDate: 1 });

            if (!officials.length) {
                throw new Error('No available officials found in the department');
            }

            // Get the official with the least recent assignment
            const selectedOfficial = officials[0];

            // Update the official's last assignment date
            await Official.findByIdAndUpdate(selectedOfficial._id, {
                lastAssignmentDate: new Date(),
                $inc: { activeAssignments: 1 }
            });

            return selectedOfficial;
        } catch (error) {
            console.error('Error getting next available official:', error);
            throw error;
        }
    }

    static async assignGrievance(grievanceId) {
        try {
            const grievance = await Petition.findById(grievanceId);
            if (!grievance) {
                throw new Error('Grievance not found');
            }

            const official = await this.getNextAvailableOfficial(grievance.department);

            // Update grievance with assignment
            grievance.assignedOfficer = official._id;
            grievance.status = 'Assigned';
            grievance.assignmentHistory.push({
                official: official._id,
                status: 'Assigned'
            });

            await grievance.save();

            return {
                grievance,
                official
            };
        } catch (error) {
            console.error('Error assigning grievance:', error);
            throw error;
        }
    }

    static async handleAssignmentResponse(grievanceId, officialId, accepted, reason = null) {
        try {
            const grievance = await Petition.findById(grievanceId);
            if (!grievance) {
                throw new Error('Grievance not found');
            }

            if (accepted) {
                // Update grievance status and history
                grievance.status = 'In Progress';
                grievance.assignmentHistory.push({
                    official: officialId,
                    status: 'Accepted'
                });
                await grievance.save();

                return grievance;
            } else {
                // Decline the assignment
                grievance.assignmentHistory.push({
                    official: officialId,
                    status: 'Declined',
                    reason
                });

                // Reset assignment and try to assign to another official
                grievance.assignedOfficer = null;
                grievance.status = 'Pending';
                await grievance.save();

                // Update official's status
                await Official.findByIdAndUpdate(officialId, {
                    $inc: { activeAssignments: -1 }
                });

                // Try to assign to another official
                return await this.assignGrievance(grievanceId);
            }
        } catch (error) {
            console.error('Error handling assignment response:', error);
            throw error;
        }
    }

    static async getAssignmentStats() {
        try {
            const stats = await Petition.aggregate([
                {
                    $group: {
                        _id: '$department',
                        total: { $sum: 1 },
                        pending: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0]
                            }
                        },
                        inProgress: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0]
                            }
                        },
                        resolved: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0]
                            }
                        }
                    }
                }
            ]);

            return stats;
        } catch (error) {
            console.error('Error getting assignment stats:', error);
            throw error;
        }
    }
}

export default AssignmentService; 