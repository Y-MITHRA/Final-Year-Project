import React, { useState, useEffect } from "react";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { MessageSquare, Phone, User, Bell, ChevronDown, LogOut, Check, X } from "lucide-react";
import { Container, Row, Col, Card, Button, Dropdown, Alert } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import io from 'socket.io-client';
import axiosInstance from "../utils/axiosConfig";
import { toast } from 'react-hot-toast';

const CaseCard = ({ caseData, onAccept, onDecline, onDragStart }) => {
    const [isCommenting, setIsCommenting] = useState(false);
    const [comment, setComment] = useState("");

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case "high":
                return "badge bg-danger";
            case "medium":
                return "badge bg-warning text-dark";
            case "low":
                return "badge bg-success";
            default:
                return "badge bg-secondary";
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Card className="mb-3 shadow-sm" draggable={caseData.status !== 'Pending'} onDragStart={(e) => onDragStart(e, caseData._id)}>
            <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                    <h5 className="card-title">{caseData.subject}</h5>
                    <span className={getPriorityColor(caseData.priority)}>{caseData.priority}</span>
                </div>

                <p className="text-muted mb-1">Case ID: {caseData._id}</p>
                <p className="text-muted mb-1">Filed: {formatDate(caseData.dateFiled)}</p>
                <p className="text-muted mb-1">Petitioner: {caseData.petitionerName}</p>
                {caseData.assignedOfficer && (
                    <p className="text-muted">
                        <User size={16} className="me-1" />
                        {caseData.assignedOfficerName}
                    </p>
                )}
                <p className="mb-2">{caseData.description}</p>

                {caseData.status === 'Pending' ? (
                    <div className="d-flex justify-content-between mt-3">
                        <Button variant="success" size="sm" onClick={() => onAccept(caseData._id)}>
                            <Check size={16} className="me-1" />
                            Accept
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => onDecline(caseData._id)}>
                            <X size={16} className="me-1" />
                            Decline
                        </Button>
                    </div>
                ) : (
                    <div className="d-flex justify-content-between mt-3">
                        <Button variant="outline-secondary" size="sm" onClick={() => setIsCommenting(!isCommenting)}>
                            <MessageSquare size={16} className="me-1" />
                            Chat
                        </Button>
                        <Button variant="outline-primary" size="sm">
                            <Phone size={16} className="me-1" />
                            Contact
                        </Button>
                    </div>
                )}

                {isCommenting && (
                    <div className="mt-3">
                        <textarea
                            className="form-control"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Type your message..."
                            rows={2}
                        />
                        <div className="d-flex justify-content-end mt-2">
                            <Button variant="light" size="sm" onClick={() => setIsCommenting(false)}>
                                Cancel
                            </Button>
                            <Button variant="success" size="sm" className="ms-2" onClick={() => {
                                // TODO: Send message via WebSocket
                                setComment("");
                                setIsCommenting(false);
                            }}>
                                Send
                            </Button>
                        </div>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

const OfficialDashboard = () => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [columns, setColumns] = useState({
        pending: {
            title: "Pending Acceptance",
            cases: []
        },
        assigned: {
            title: "Assigned Cases",
            cases: []
        },
        inProgress: {
            title: "In Progress",
            cases: []
        },
        resolved: {
            title: "Resolved",
            cases: []
        }
    });

    const [draggedCase, setDraggedCase] = useState(null);

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
            console.log('Connected to WebSocket');
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

        // Handle department stats updates
        newSocket.on('department_stats', (stats) => {
            console.log('Department stats updated:', stats);
            // Update UI with new stats if needed
        });

        // Handle errors
        newSocket.on('error', (error) => {
            console.error('WebSocket error:', error);
            toast.error(error.message || 'An error occurred');
        });

        setSocket(newSocket);

        // Fetch initial grievances
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
            setError('User ID not available');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Log the request details
            console.log('Fetching grievances with:', {
                userId: user.id,
                department: user.department,
                token: localStorage.getItem('token') ? 'Present' : 'Missing'
            });

            const response = await axiosInstance.get(`/api/grievances/official/${user.id}`);

            // Log the raw response
            console.log('Raw API response:', response.data);

            // Validate response data
            if (!response.data || typeof response.data !== 'object') {
                console.error('Invalid response format:', response.data);
                throw new Error('Invalid response data format');
            }

            // Log the counts of grievances in each category
            const counts = {
                pending: response.data.pending_acceptance?.length || 0,
                assigned: response.data.assigned?.length || 0,
                inProgress: response.data.inProgress?.length || 0,
                resolved: response.data.resolved?.length || 0
            };
            console.log('Grievance counts:', counts);

            // Process and set the columns data
            const newColumns = {
                pending: {
                    title: "Pending Acceptance",
                    cases: Array.isArray(response.data.pending_acceptance) ? response.data.pending_acceptance : []
                },
                assigned: {
                    title: "Assigned Cases",
                    cases: Array.isArray(response.data.assigned) ? response.data.assigned : []
                },
                inProgress: {
                    title: "In Progress",
                    cases: Array.isArray(response.data.inProgress) ? response.data.inProgress : []
                },
                resolved: {
                    title: "Resolved",
                    cases: Array.isArray(response.data.resolved) ? response.data.resolved : []
                }
            };

            // Log sample data from each category
            Object.entries(newColumns).forEach(([key, value]) => {
                console.log(`${key} category:`, {
                    count: value.cases.length,
                    sample: value.cases[0] ? {
                        id: value.cases[0]._id,
                        subject: value.cases[0].subject,
                        status: value.cases[0].status
                    } : null
                });
            });

            setColumns(newColumns);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching grievances:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            setError(error.response?.data?.message || 'Failed to fetch grievances');
            toast.error('Failed to fetch grievances. Please try refreshing the page.');
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

    const handleDragStart = (e, caseId) => {
        setDraggedCase(caseId);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (e, columnId) => {
        e.preventDefault();
        if (!draggedCase) return;

        try {
            const newStatus = columnId === 'inProgress' ? 'In Progress' :
                columnId.charAt(0).toUpperCase() + columnId.slice(1);

            const response = await axiosInstance.post(`/api/grievances/${draggedCase}/updateStatus`, {
                status: newStatus
            });

            console.log('Status updated:', response.data);
            toast.success('Status updated successfully');
            fetchGrievances();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error(error.response?.data?.message || 'Failed to update status');
        } finally {
            setDraggedCase(null);
        }
    };

    if (loading) {
        return (
            <>
                <NavBar />
                <Container className="py-4">
                    <div className="text-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading grievances...</p>
                    </div>
                </Container>
            </>
        );
    }

    if (error) {
        return (
            <>
                <NavBar />
                <Container className="py-4">
                    <Alert variant="danger">
                        {error}
                    </Alert>
                </Container>
            </>
        );
    }

    return (
        <>
            <NavBar />
            <Container fluid className="py-4">
                <h2 className="mb-4">Official Dashboard - {user?.department} Department</h2>
                <Row>
                    {Object.entries(columns).map(([columnId, column]) => (
                        <Col key={columnId} md={3}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, columnId)}
                            className="mb-4">
                            <div className="bg-light p-3 rounded">
                                <h5 className="mb-3">
                                    {column.title}
                                    <span className="badge bg-secondary ms-2">
                                        {column.cases.length}
                                    </span>
                                </h5>
                                <div className="grievance-list">
                                    {column.cases.map((caseData) => (
                                        <CaseCard
                                            key={caseData._id}
                                            caseData={caseData}
                                            onAccept={handleAccept}
                                            onDecline={handleDecline}
                                            onDragStart={handleDragStart}
                                        />
                                    ))}
                                    {column.cases.length === 0 && (
                                        <p className="text-muted text-center">No grievances</p>
                                    )}
                                </div>
                            </div>
                        </Col>
                    ))}
                </Row>
            </Container>
        </>
    );
};

export default OfficialDashboard;
