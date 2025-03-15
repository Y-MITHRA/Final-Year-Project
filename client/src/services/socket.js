import { io } from 'socket.io-client';

class SocketService {
    constructor() {
        this.socket = null;
    }

    connect(token) {
        if (!token) {
            console.error('No token provided for socket connection');
            return;
        }

        // Format token with Bearer prefix if not present
        const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        console.log('Connecting socket with token:', formattedToken.substring(0, 50) + '...');

        try {
            this.socket = io('http://localhost:5000', {
                path: '/socket.io/',
                transports: ['websocket', 'polling'],
                auth: {
                    token: formattedToken
                },
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });

            this.socket.on('connect', () => {
                console.log('Socket connected successfully');
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error.message);
            });

            this.socket.on('error', (error) => {
                console.error('Socket error:', error);
            });

            this.socket.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
            });

        } catch (error) {
            console.error('Error initializing socket:', error);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            console.log('Socket disconnected manually');
        }
    }

    // Add your event listeners and emitters here
    on(event, callback) {
        if (!this.socket) {
            console.error('Socket not initialized');
            return;
        }
        this.socket.on(event, callback);
    }

    emit(event, data) {
        if (!this.socket) {
            console.error('Socket not initialized');
            return;
        }
        this.socket.emit(event, data);
    }
}

export default new SocketService(); 