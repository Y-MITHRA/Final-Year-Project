import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import '../styles/ChatPanel.css';

const ChatPanel = ({ grievanceId, petitionerId, onClose, socket }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [typing, setTyping] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const [petitionerDetails, setPetitionerDetails] = useState(null);

    useEffect(() => {
        if (!socket || !grievanceId || !user?.id) return;

        console.log('Joining chat room:', grievanceId);
        // Join the chat room
        socket.emit('join_chat', {
            grievanceId,
            userId: user.id,
            role: 'official'
        });

        // Listen for new messages
        const handleNewMessage = (message) => {
            console.log('New message received in chat:', message);
            setMessages(prev => [...prev, message]);

            // Mark message as read if it's received by the current user
            if (message.recipientId === user.id) {
                markMessageAsRead(message.id);
            }
            scrollToBottom();
        };

        // Listen for typing indicators
        const handleTypingStart = ({ userId }) => {
            console.log('User started typing:', userId);
            if (userId !== user.id) {
                setOtherUserTyping(true);
            }
        };

        const handleTypingEnd = ({ userId }) => {
            console.log('User stopped typing:', userId);
            if (userId !== user.id) {
                setOtherUserTyping(false);
            }
        };

        // Listen for message read status updates
        const handleMessageRead = ({ messageId }) => {
            console.log('Message marked as read:', messageId);
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === messageId ? { ...msg, read: true } : msg
                )
            );
        };

        socket.on('new_message', handleNewMessage);
        socket.on('typing_start', handleTypingStart);
        socket.on('typing_end', handleTypingEnd);
        socket.on('message_read', handleMessageRead);

        return () => {
            console.log('Leaving chat room:', grievanceId);
            socket.off('new_message', handleNewMessage);
            socket.off('typing_start', handleTypingStart);
            socket.off('typing_end', handleTypingEnd);
            socket.off('message_read', handleMessageRead);
            socket.emit('leave_chat', { grievanceId });
        };
    }, [socket, grievanceId, user?.id]);

    useEffect(() => {
        if (!grievanceId || !petitionerId) return;

        fetchChatHistory();
        fetchPetitionerDetails();
    }, [grievanceId, petitionerId]);

    const fetchPetitionerDetails = async () => {
        try {
            console.log('Fetching petitioner details:', petitionerId);
            const response = await fetch(`http://localhost:5000/api/petitioners/${petitionerId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch petitioner details: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Received petitioner details:', data);
            setPetitionerDetails(data);
        } catch (error) {
            console.error('Error fetching petitioner details:', error);
            setError('Failed to load petitioner details');
        }
    };

    const fetchChatHistory = async () => {
        try {
            setIsLoading(true);
            setError(null);
            console.log('Fetching chat history for grievance:', grievanceId);

            const response = await fetch(`http://localhost:5000/api/chat/${grievanceId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch chat history: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Received chat history:', data);
            setMessages(data.messages);

            // Mark all unread messages as read
            const unreadMessages = data.messages.filter(
                m => m.sender !== user.id && !m.read
            );

            console.log('Marking unread messages as read:', unreadMessages.length);
            unreadMessages.forEach(message => {
                markMessageAsRead(message.id);
            });
        } catch (error) {
            console.error('Error fetching chat history:', error);
            setError('Failed to load chat history. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const markMessageAsRead = async (messageId) => {
        try {
            console.log('Marking message as read:', messageId);
            const response = await fetch(`http://localhost:5000/api/chat/messages/${messageId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to mark message as read: ${response.statusText}`);
            }

            // Emit message read event
            socket?.emit('message_read', { messageId, grievanceId });
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);

        if (!socket) return;

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Emit typing start
        if (!typing) {
            setTyping(true);
            socket.emit('typing_start', { grievanceId, userId: user.id });
        }

        // Set timeout to stop typing
        typingTimeoutRef.current = setTimeout(() => {
            setTyping(false);
            socket.emit('typing_end', { grievanceId, userId: user.id });
        }, 1000);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !socket) return;

        try {
            console.log('Sending new message');
            const messageData = {
                grievanceId,
                sender: user.id,
                senderName: `${user.firstName} ${user.lastName}`,
                recipientId: petitionerId,
                content: newMessage.trim(),
                timestamp: new Date()
            };

            // Emit message through socket
            socket.emit('send_message', messageData);

            // Store message in database
            const response = await fetch('http://localhost:5000/api/chat/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(messageData)
            });

            if (!response.ok) {
                throw new Error(`Failed to send message: ${response.statusText}`);
            }

            // Clear input and typing status
            setNewMessage('');
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            socket.emit('typing_end', { grievanceId, userId: user.id });
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message. Please try again.');
        }
    };

    return (
        <div className="detail-panel">
            <div className="detail-header">
                <div className="detail-title">
                    <h3>
                        Chat with {petitionerDetails ?
                            `${petitionerDetails.firstName} ${petitionerDetails.lastName}` :
                            'Petitioner'}
                    </h3>
                    {onClose && (
                        <button className="close-btn" onClick={onClose}>×</button>
                    )}
                </div>
            </div>

            <div className="detail-content">
                {isLoading ? (
                    <div className="loading">Loading chat history...</div>
                ) : error ? (
                    <div className="error-message">{error}</div>
                ) : (
                    <>
                        {messages.length === 0 ? (
                            <div className="empty-chat">
                                No messages yet. Start the conversation!
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <div
                                    key={message.id || index}
                                    className={`message ${message.sender === user.id ? 'sent' : 'received'}`}
                                >
                                    <div className="message-sender">{message.senderName}</div>
                                    <p>{message.content}</p>
                                    <div className="message-info">
                                        <span className="timestamp">
                                            {format(new Date(message.timestamp), 'HH:mm')}
                                        </span>
                                        {message.sender === user.id && message.read && (
                                            <span className="read-status">✓</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        {otherUserTyping && (
                            <div className="typing-indicator">
                                <span>Typing</span>
                                <span className="dots">...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            <div className="response-box">
                <textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    disabled={isLoading || error}
                />
                <div className="response-actions">
                    <button
                        className="send-btn"
                        onClick={handleSendMessage}
                        disabled={isLoading || error || !newMessage.trim()}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel; 