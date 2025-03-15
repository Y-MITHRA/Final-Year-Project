import WebSocketService from './services/WebSocketService.js';

export const createSocketServer = (httpServer) => {
    const webSocketService = new WebSocketService(httpServer);
    return webSocketService.io;
};

export default createSocketServer; 