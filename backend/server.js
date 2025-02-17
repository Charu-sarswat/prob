const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { createServer } = require('http');
const { Server } = require('socket.io');
const User = require('./models/User');

// Load correct env file
dotenv.config({
    path: process.env.NODE_ENV === 'production' 
        ? '.env.production' 
        : '.env'
});

// Connect to database
connectDB();

const app = express();
const httpServer = createServer(app);

// Update CORS for both development and production
const allowedOrigins = [
    'http://localhost:5173',  // development
    'https://your-netlify-app-name.netlify.app'  // you'll add this later
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Basic route to test deployment
app.get('/', (req, res) => {
    res.json({ message: 'Hobby Matcher API is running' });
});

// Wake-up route
app.get('/api/wake-up', (req, res) => {
    res.json({ status: 'Server is awake' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));

const connectedUsers = new Map();

// Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Socket.io
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('register-user', (userId) => {
        console.log('Registering user:', userId);
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        
        // Update user's online status in database
        User.findByIdAndUpdate(userId, { isOnline: true })
            .then(() => {
                // Broadcast to all clients that this user is online
                io.emit('user-status-change', { userId, isOnline: true });
            });
    });

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        // Notify other participants that user has left
        socket.to(roomId).emit('user-disconnected', socket.id);
    });

    socket.on('send-message', (data) => {
        socket.to(data.roomId).emit('receive-message', data);
    });

    socket.on('end-call', ({ roomId }) => {
        console.log('Call ended in room:', roomId);
        // Notify everyone in the room except sender
        socket.to(roomId).emit('call-ended');
        // Leave the room
        socket.leave(roomId);
    });

    socket.on('disconnect', async () => {
        if (socket.userId) {
            connectedUsers.delete(socket.userId);
            // Update user's online status in database
            await User.findByIdAndUpdate(socket.userId, { isOnline: false });
            // Broadcast to all clients that this user is offline
            io.emit('user-status-change', { userId: socket.userId, isOnline: false });
        }
        console.log('User disconnected:', socket.id);
    });

    // Handle call initiation
    socket.on('initiate-call', ({ targetUserId, roomId }) => {
        console.log('Call initiated:', { targetUserId, roomId });
        const targetSocketId = connectedUsers.get(targetUserId);
        
        if (targetSocketId) {
            io.to(targetSocketId).emit('incoming-call', {
                roomId,
                callerId: socket.userId
            });
        } else {
            socket.emit('call-failed', { message: 'User is not online' });
        }
    });

    // Handle call acceptance
    socket.on('accept-call', ({ roomId, callerId }) => {
        socket.to(callerId).emit('call-accepted', {
            roomId,
            accepterId: socket.id
        });
    });

    // Handle call rejection
    socket.on('reject-call', ({ roomId, callerId }) => {
        socket.to(callerId).emit('call-rejected', {
            roomId,
            rejecterId: socket.id
        });
    });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    httpServer.close(() => process.exit(1));
});