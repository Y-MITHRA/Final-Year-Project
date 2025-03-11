// import express from 'express';
// import connectDB from './config/db.js';
// import registrationRoutes from './routes/registrationRoutes.js';
// import authRoutes from './routes/authRoutes.js';
// connectDB();
// const app = express();
// const PORT = process.env.PORT || 5000;

// // Database Connection


// // Middleware
// app.use(express.json());

// // Routes
// app.use('/api', registrationRoutes);
// app.use('/api', authRoutes);

// // Server Listening
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


import express from 'express';
import cors from 'cors';  // Import CORS middleware
import connectDB from './config/db.js';
import registrationRoutes from './routes/registrationRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Database Connection
connectDB();

// Middleware
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' })); // ✅ Ensure React app requests are allowed

// Routes
app.use('/api', registrationRoutes);
app.use('/api', authRoutes);

// Server Listening
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
