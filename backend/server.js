require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');

const connectDB = require('./config/database');
 const initializeSocket = require('./config/socket');
const errorHandler = require('./middleware/errorHandler');
// Import routes
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notifsRoutes = require('./routes/notificationRoutes.js');
const ScoreRoutes = require('./routes/scoreRoutes.js');

const router = express.Router();
// Legacy routes (deprecated in new model)
// const carRoutes = require('./routes/carRoutes');
// const bidRoutes = require('./routes/bidRoutes');
// const reservationRoutes = require('./routes/reservationRoutes');

// Initialize app
const app = express();
const server = http.createServer(app);

 // Initialize Socket.io
const io = initializeSocket(server);
app.set('io', io); 

// Connect to database
connectDB();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads/cars', express.static(path.join(__dirname, 'uploads/cars')));

// const corsOptions = {
// origin: ['http://localhost:5173', 'http://localhost:8081', 'http://192.168.0.159:19006'], 
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
//   exposedHeaders: ['Content-Range', 'X-Content-Range']
// };
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};

app.use(cors(corsOptions));

// Enable pre-flight requests for all routes
app.options('*', cors(corsOptions));


app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  req.io = io;
  next();
 });
// routes/notifications.js




module.exports = router;

// API Routes - New Dream Car Request Model
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifs', notifsRoutes);
app.use('/api/scores', ScoreRoutes);
app.use('/api/reviews', require('./routes/reviewRoutes'));



// Legacy routes (commented out - old car browsing model)
// app.use('/api/cars', carRoutes);
// app.use('/api/bids', bidRoutes);
// app.use('/api/reservations', reservationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Kree Car Rental API',
    version: '1.0.0',
    status: 'active'
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT;
server.listen(PORT,'0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

module.exports = app;
