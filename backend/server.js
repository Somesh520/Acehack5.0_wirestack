require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');

// Modular Imports
const connectDB = require('./config/db');
const configurePassport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const learningRoutes = require('./routes/learningRoutes');
const MongoStore = require('connect-mongo').default;

const app = express();
const PORT = process.env.PORT || 3000;
const VERBOSE_REQUEST_LOGS = process.env.VERBOSE_REQUEST_LOGS === 'true';

// Trust proxy for session cookies to work behind Render/Vercel load balancers
app.set('trust proxy', true);

// Connect to MongoDB
connectDB();

// Middleware
const frontendOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const isHttpsMode = frontendOrigin.includes('https');

app.use(cors({
    origin: frontendOrigin,
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// Session config
app.use(session({
    secret: process.env.SESSION_SECRET || 'wirestack_secret_key_123',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // 1 day
    }),
    proxy: true, // Trust the reverse proxy when setting secure cookies (via app.set)
    cookie: {
        secure: isHttpsMode, // true for HTTPS (production), false for HTTP (localhost)
        sameSite: isHttpsMode ? 'none' : 'lax', // Cross-domain for production, lax for local
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Cookie debugging middleware (optional)
if (VERBOSE_REQUEST_LOGS) {
    app.use((req, res, next) => {
        console.log(`[COOKIE IN] -> ${req.headers.cookie ? 'Present' : 'None'} | Origin: ${req.headers.origin || req.headers.referer || 'Unknown'}`);
        const originalSend = res.send;
        res.send = function () {
            console.log(`[COOKIE OUT] <- ${res.get('Set-Cookie') || 'None'}`);
            return originalSend.apply(res, arguments);
        };
        next();
    });
}

// Passport Config
app.use(passport.initialize());
app.use(passport.session());

// Request Logger (optional)
if (VERBOSE_REQUEST_LOGS) {
    app.use((req, res, next) => {
        console.log(`[PID:${process.pid}] ${new Date().toISOString()} - ${req.method} ${req.url} - Session:${req.sessionID} - User:${req.user ? req.user.email : 'None'}`);
        next();
    });
}

configurePassport(passport);

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/v1', learningRoutes);  // Anti-Vibe-Coding Learning Engine

app.get('/', (req, res) => {
    res.send('WireStack Backend Engine is running v4.0.0');
});

// Core Generation Engine Placeholder Route
app.post('/api/generate', (req, res) => {
    res.json({ message: "Generate endpoint hit successfully. Stitching engine not yet integrated." });
});

app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    // Assuming connectDB() logs the MongoDB connection status.
    // The instruction implies adding the GitHub token status after the MongoDB log.
    // If the MongoDB log is not explicitly here, it's handled by connectDB().
    console.log(process.env.GITHUB_TOKEN ? '✅ GitHub Token: Loaded' : '⚠️ GitHub Token: Not found (Rate limits will be low)');
});
