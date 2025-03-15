import React, { useState, useEffect } from "react";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { Plus, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosConfig";
import io from 'socket.io-client';
import { Modal, Button } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import "bootstrap/dist/css/bootstrap.min.css";

const ChatModal = ({ show, handleClose, grievanceId, officialName }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        if (show && grievanceId) {
            // Connect to WebSocket
            const newSocket = io('http://localhost:5000', {
                auth: { token: localStorage.getItem('token') },
                query: { grievanceId }
            });

            newSocket.on('connect', () => {
                console.log('Connected to chat socket');
                // Load chat history
                loadChatHistory();
            });

            newSocket.on('new_message', (message) => {
                setMessages(prev => [...prev, message]);
                // Scroll to bottom
                const chatContainer = document.getElementById('chat-messages');
                if (chatContainer) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            });

            setSocket(newSocket);

            return () => {
                if (newSocket) newSocket.disconnect();
            };
        }
    }, [show, grievanceId]);

    const loadChatHistory = async () => {
        try {
            const response = await axiosInstance.get(`/api/chat/${grievanceId}/messages`);
            setMessages(response.data);
        } catch (error) {
            console.error('Error loading chat history:', error);
            toast.error('Failed to load chat history');
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            const response = await axiosInstance.post(`/api/chat/${grievanceId}/send`, {
                content: newMessage
            });

            if (socket) {
                socket.emit('send_message', {
                    grievanceId,
                    content: newMessage,
                    sender: user.id
                });
            }

            setNewMessage("");
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        }
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Chat with {officialName}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div id="chat-messages" style={{ height: '400px', overflowY: 'auto' }} className="mb-3">
                    {messages.map((msg, index) => (
                        <div key={index} className={`mb-2 ${msg.sender === user.id ? 'text-end' : ''}`}>
                            <div className={`d-inline-block p-2 rounded ${msg.sender === user.id ? 'bg-primary text-white' : 'bg-light'}`}>
                                {msg.content}
                            </div>
                            <div className="small text-muted">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="d-flex">
                    <input
                        type="text"
                        className="form-control me-2"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <Button onClick={sendMessage}>Send</Button>
                </div>
            </Modal.Body>
        </Modal>
    );
};

const PetitionerDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [petitions, setPetitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [socket, setSocket] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [selectedGrievance, setSelectedGrievance] = useState(null);

    useEffect(() => {
        // Initialize WebSocket connection for real-time updates
        const newSocket = io('http://localhost:5000', {
            auth: { token: localStorage.getItem('token') },
            query: { userId: user?.id }
        });

        newSocket.on('connect', () => {
            console.log('Connected to WebSocket');
            fetchPetitions();
        });

        newSocket.on('grievance_updated', (data) => {
            console.log('Grievance updated:', data);
            fetchPetitions();
            if (data.type === 'ASSIGNED') {
                toast.success(`Your grievance has been assigned to ${data.officialName}`);
            }
        });

        newSocket.on('new_message', (data) => {
            toast.success('New message received');
        });

        setSocket(newSocket);

        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, [user?.id]);

    const fetchPetitions = async () => {
        try {
            const response = await axiosInstance.get('/api/petitions/my-petitions');
            setPetitions(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch petitions');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        if (socket) socket.disconnect();
        logout();
        navigate('/login');
    };

    const openChat = (petition) => {
        if (!petition.assignedOfficer) {
            toast.error('No official assigned yet');
            return;
        }
        setSelectedGrievance(petition);
        setShowChat(true);
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Pending':
                return 'bg-warning';
            case 'Assigned':
                return 'bg-info';
            case 'In Progress':
                return 'bg-primary';
            case 'Resolved':
                return 'bg-success';
            case 'Rejected':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    };

    if (loading) {
        return (
            <>
                <NavBar />
                <div className="container py-5">
                    <div className="text-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <NavBar />
            <div className="container-fluid bg-light min-vh-100">
                <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
                    <div className="container">
                        <a className="navbar-brand fw-bold" href="#">Grievance Portal</a>
                        <div className="d-flex align-items-center gap-3">
                            <span className="text-muted">Welcome, {user?.name}</span>
                            <button
                                className="btn btn-primary d-flex align-items-center"
                                onClick={() => navigate("/submit-grievance")}
                            >
                                <Plus size={18} className="me-2" />
                                Submit New Petition
                            </button>
                            <button
                                className="btn btn-outline-danger"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </nav>

                <div className="container py-4">
                    <h1 className="h4 fw-bold">Your Petitions</h1>
                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}
                    <div className="card shadow-sm">
                        <div className="card-body">
                            {petitions.length === 0 ? (
                                <div className="text-center py-5">
                                    <p className="text-muted">No petitions found. Submit your first grievance!</p>
                                </div>
                            ) : (
                                <table className="table table-hover">
                                    <thead className="table-light">
                                        <tr>
                                            {["Petition ID", "Category", "Date Filed", "Status", "Expected Resolution", "Assigned Officer", "Department", "Actions"].map(
                                                (header) => (
                                                    <th key={header} className="text-uppercase small">{header}</th>
                                                )
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {petitions.map((petition) => (
                                            <tr key={petition._id}>
                                                <td className="text-primary fw-bold">{petition._id}</td>
                                                <td>{petition.subject}</td>
                                                <td>{new Date(petition.dateFiled).toLocaleDateString()}</td>
                                                <td>
                                                    <span className={`badge ${getStatusBadgeClass(petition.status)}`}>
                                                        {petition.status}
                                                    </span>
                                                </td>
                                                <td>{new Date(petition.expectedResolution).toLocaleDateString()}</td>
                                                <td>
                                                    {petition.assignedOfficer ? (
                                                        <span className="text-success">
                                                            {petition.assignedOfficerName}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted">Not Assigned</span>
                                                    )}
                                                </td>
                                                <td>{petition.department}</td>
                                                <td>
                                                    <Button
                                                        variant={petition.assignedOfficer ? "primary" : "secondary"}
                                                        size="sm"
                                                        onClick={() => openChat(petition)}
                                                        disabled={!petition.assignedOfficer}
                                                    >
                                                        <MessageSquare size={16} className="me-1" />
                                                        Chat
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Footer />

            <ChatModal
                show={showChat}
                handleClose={() => setShowChat(false)}
                grievanceId={selectedGrievance?._id}
                officialName={selectedGrievance?.assignedOfficerName}
            />
        </>
    );
};

export default PetitionerDashboard;
