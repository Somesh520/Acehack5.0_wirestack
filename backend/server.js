require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');

// Modular Imports
const connectDB = require('./config/db');
const configurePassport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for session cookies to work behind Vite proxy
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());

// Session config
app.use(session({
    secret: process.env.SESSION_SECRET || 'wirestack_secret_key_123',
    resave: false,
    saveUninitialized: false,
    proxy: true, // Required for proxy support
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport Config
app.use(passport.initialize());
app.use(passport.session());

// Request Logger (moved after session/passport for diagnostics)
app.use((req, res, next) => {
    console.log(`[PID:${process.pid}] ${new Date().toISOString()} - ${req.method} ${req.url} - Session:${req.sessionID} - User:${req.user ? req.user.email : 'None'}`);
    next();
});

configurePassport(passport);

// --- Routes ---
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('WireStack Backend Engine is running v4.0.0');
});

// Core Generation Engine Placeholder Route
app.post('/api/generate', (req, res) => {
    res.json({ message: "Generate endpoint hit successfully. Stitching engine not yet integrated." });
});

app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});
