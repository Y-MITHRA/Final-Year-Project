import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axiosConfig';
import { Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Chat = ({ chatId, onClose }) => {
    const { user, getToken } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [socket, setSocket] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // Initialize socket connection
        const newSocket = io('http://localhost:5000', {
            auth: {
                token: getToken()
            }
        });

        newSocket.on('connect', () => {
            console.log('Connected to chat server');
            newSocket.emit('join_chat', chatId);
        });

        newSocket.on('new_message', (data) => {
            if (data.chatId === chatId) {
                setMessages(prev => [...prev, data.message]);
                scrollToBottom();
            }
        });

        newSocket.on('error', (error) => {
            console.error('Socket error:', error);
            setError('Connection error. Please try again.');
        });

        setSocket(newSocket);

        // Fetch chat history
        const fetchChat = async () => {
            try {
                const response = await axiosInstance.get(`/api/chat/${chatId}`);
                setMessages(response.data.messages);
                setLoading(false);
                scrollToBottom();
            } catch (error) {
                console.error('Error fetching chat:', error);
                setError('Failed to load chat history');
                setLoading(false);
            }
        };

        fetchChat();

        // Mark messages as read
        const markAsRead = async () => {
            try {
                await axiosInstance.put(`/api/chat/${chatId}/read`);
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        };

        markAsRead();

        return () => {
            newSocket.disconnect();
        };
    }, [chatId, getToken]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            socket.emit('send_message', {
                chatId,
                content: newMessage.trim()
            });

            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message');
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center h-100">
                <Loader2 className="animate-spin" size={24} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger">
                {error}
            </div>
        );
    }

    return (
        <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center bg-primary text-white">
                <h5 className="mb-0">Chat</h5>
                <button className="btn btn-close btn-close-white" onClick={onClose}></button>
            </div>
            <div className="card-body d-flex flex-column" style={{ height: '400px' }}>
                <div className="flex-grow-1 overflow-auto mb-3">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`d-flex mb-2 ${message.sender === user.id ? 'justify-content-end' : 'justify-content-start'}`}
                        >
                            <div
                                className={`p-2 rounded-3 ${message.sender === user.id
                                        ? 'bg-primary text-white'
                                        : 'bg-light'
                                    }`}
                                style={{ maxWidth: '75%' }}
                            >
                                <div className="message-content">{message.content}</div>
                                <small className={`d-block mt-1 ${message.sender === user.id ? 'text-white-50' : 'text-muted'}`}>
                                    {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                                </small>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="mt-auto">
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Type your message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary d-flex align-items-center"
                            disabled={!newMessage.trim()}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Chat; 