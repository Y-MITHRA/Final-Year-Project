import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axiosConfig';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { toast } from 'react-hot-toast';
import io from 'socket.io-client';

const OfficialDashboard = () => {
    const { user } = useAuth();
    const [grievances, setGrievances] = useState({
        pending_acceptance: [],
        assigned: [],
        inProgress: [],
        resolved: [],
        closed: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (!user?.id) {
            setError('User not authenticated');
            return;
        }

        // Initialize WebSocket connection
        const newSocket = io('http://localhost:5000', {
            auth: {
                token: localStorage.getItem('token')
            },
            query: {
                userId: user.id,
                department: user.department
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        newSocket.on('connect', () => {
            console.log('Socket connected successfully');
            newSocket.emit('joinDepartment', user.department);
            fetchGrievances();
        });

        newSocket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            toast.error('Real-time updates disconnected. Retrying...');
        });

        newSocket.on('reconnect', () => {
            console.log('Reconnected to WebSocket');
            toast.success('Real-time updates restored');
            fetchGrievances();
        });

        // Handle new grievance notifications
        newSocket.on('new_grievance_assigned', (data) => {
            console.log('New grievance assigned:', data);
            toast.success(`New grievance assigned: ${data.title}`);
            fetchGrievances();
        });

        // Handle grievance status updates
        newSocket.on('grievance_status_updated', (data) => {
            console.log('Grievance status updated:', data);
            toast.success(`Grievance status updated: ${data.status}`);
            fetchGrievances();
        });

        setSocket(newSocket);
        fetchGrievances();

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [user?.id]);

    const fetchGrievances = async () => {
        if (!user?.id) {
            console.error('No user ID available');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            console.log('Fetching grievances for official:', user.id);
            const response = await axiosInstance.get(`/api/grievances/official/${user.id}`);
            console.log('Raw API response:', response.data);

            // Directly use the response data
            const newGrievances = {
                pending_acceptance: response.data.pending_acceptance || [],
                assigned: response.data.assigned || [],
                inProgress: response.data.inProgress || [],
                resolved: response.data.resolved || [],
                closed: response.data.closed || []
            };

            // Log the data for debugging
            console.log('Setting grievances:', newGrievances);
            console.log('Pending count:', newGrievances.pending_acceptance.length);
            console.log('Sample pending grievance:', newGrievances.pending_acceptance[0]);

            setGrievances(newGrievances);
        } catch (error) {
            console.error('Error fetching grievances:', error);
            setError(error.response?.data?.message || 'Failed to fetch grievances');
            toast.error('Failed to fetch grievances');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (grievanceId) => {
        try {
            const response = await axiosInstance.post(`/api/grievances/${grievanceId}/accept`);
            console.log('Grievance accepted:', response.data);
            toast.success('Grievance accepted successfully');
            fetchGrievances();
        } catch (error) {
            console.error('Error accepting grievance:', error);
            toast.error(error.response?.data?.message || 'Failed to accept grievance');
        }
    };

    const handleDecline = async (grievanceId) => {
        try {
            const response = await axiosInstance.post(`/api/grievances/${grievanceId}/decline`);
            console.log('Grievance declined:', response.data);
            toast.success('Grievance declined successfully');
            fetchGrievances();
        } catch (error) {
            console.error('Error declining grievance:', error);
            toast.error(error.response?.data?.message || 'Failed to decline grievance');
        }
    };

    const handleDragEnd = async (result) => {
        if (!result.destination) return;

        const { source, destination, draggableId } = result;

        // Only allow moving from assigned to inProgress, inProgress to resolved, or resolved to closed
        const validMoves = {
            assigned: ['inProgress'],
            inProgress: ['resolved'],
            resolved: ['closed']
        };

        if (!validMoves[source.droppableId]?.includes(destination.droppableId)) {
            toast.error('Invalid move. Please follow the workflow.');
            return;
        }

        try {
            const newStatus = destination.droppableId === 'inProgress' ? 'In Progress' :
                destination.droppableId.charAt(0).toUpperCase() + destination.droppableId.slice(1);

            const response = await axiosInstance.post(`/api/grievances/${draggableId}/updateStatus`, {
                status: newStatus
            });

            console.log('Status updated:', response.data);
            toast.success('Grievance status updated successfully');
            fetchGrievances();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    const renderGrievance = (grievance, index) => {
        // Ensure grievance is an object
        grievance = grievance || {};

        // Get priority color
        const getPriorityColor = (priority) => {
            switch (String(priority).toLowerCase()) {
                case 'high':
                    return 'bg-red-100 text-red-800';
                case 'medium':
                    return 'bg-yellow-100 text-yellow-800';
                case 'low':
                    return 'bg-green-100 text-green-800';
                default:
                    return 'bg-gray-100 text-gray-800';
            }
        };

        // Generate a unique ID for dragging
        const draggableId = grievance._id || grievance.id || `grievance-${index}`;

        return (
            <Draggable key={draggableId} draggableId={draggableId} index={index}>
                {(provided) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="bg-white p-4 rounded-lg shadow mb-3 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-lg">
                                {grievance.subject || grievance.title || 'Grievance ' + (index + 1)}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(grievance.priority)}`}>
                                {grievance.priority || 'Medium'}
                            </span>
                        </div>

                        <p className="text-gray-600 mb-3 text-sm line-clamp-2">
                            {grievance.description || grievance.details || 'No description available'}
                        </p>

                        <div className="text-xs text-gray-500 space-y-1">
                            <div className="flex justify-between">
                                <span>ID: {(grievance._id || grievance.id || index).toString().slice(-6)}</span>
                                <span>Filed: {grievance.dateFiled || grievance.createdAt || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Petitioner: {
                                    grievance.petitionerName ||
                                    (grievance.petitioner && (
                                        typeof grievance.petitioner === 'string' ? grievance.petitioner :
                                            grievance.petitioner.name ||
                                            `${grievance.petitioner.firstName || ''} ${grievance.petitioner.lastName || ''}`.trim()
                                    )) ||
                                    'Unknown'
                                }</span>
                                {(grievance.assignedOfficerName || grievance.assignedOfficer) && (
                                    <span>Assigned: {
                                        grievance.assignedOfficerName ||
                                        (typeof grievance.assignedOfficer === 'string' ? grievance.assignedOfficer :
                                            grievance.assignedOfficer?.name ||
                                            `${grievance.assignedOfficer?.firstName || ''} ${grievance.assignedOfficer?.lastName || ''}`.trim())
                                    }</span>
                                )}
                            </div>
                            {grievance.department && (
                                <div className="text-right">
                                    <span>Department: {grievance.department}</span>
                                </div>
                            )}
                        </div>

                        {/* Show accept/decline buttons for any grievance that might be pending */}
                        {(!grievance.assignedOfficer ||
                            !grievance.status ||
                            grievance.status.toLowerCase().includes('pending') ||
                            grievance.status === 'pending_acceptance' ||
                            grievance.status === 'new') && (
                                <div className="mt-3 flex space-x-2">
                                    <button
                                        onClick={() => handleAccept(grievance._id || grievance.id)}
                                        className="flex-1 bg-green-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-600 transition-colors"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleDecline(grievance._id || grievance.id)}
                                        className="flex-1 bg-red-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600 transition-colors"
                                    >
                                        Decline
                                    </button>
                                </div>
                            )}
                    </div>
                )}
            </Draggable>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading grievances...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center text-red-500">
                    <p className="text-xl font-semibold mb-2">Error</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Official Dashboard - {user?.department} Department</h1>
                <div className="text-sm text-gray-500">
                    Total Grievances: {Object.values(grievances).reduce((acc, curr) => acc + curr.length, 0)}
                </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {Object.entries(grievances).map(([status, items]) => (
                        <div key={status} className="bg-gray-100 p-4 rounded-lg">
                            <h2 className="font-semibold mb-4 capitalize flex justify-between items-center">
                                <span>{status.replace(/_/g, ' ')}</span>
                                <span className="bg-gray-200 px-2 py-1 rounded text-sm">
                                    {items.length}
                                </span>
                            </h2>
                            <Droppable droppableId={status}>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className="min-h-[200px]"
                                    >
                                        {items.map((grievance, index) => renderGrievance(grievance, index))}
                                        {provided.placeholder}
                                        {items.length === 0 && (
                                            <div className="text-center text-gray-500 py-4">
                                                No grievances
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
};

export default OfficialDashboard; 