const errorHandler = (err, req, res, next) => {
    console.error('Error:', {
        name: err.name,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // JWT Authentication errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication failed',
            details: err.message
        });
    }

    // Express-validator errors
    if (err.array && typeof err.array === 'function') {
        return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            details: err.array()
        });
    }

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            details: err.errors
        });
    }

    // Mongoose errors
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        if (err.code === 11000) {
            return res.status(409).json({
                status: 'error',
                message: 'Duplicate entry',
                details: err.message
            });
        }
    }

    // Default server error
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
};

export default errorHandler; 