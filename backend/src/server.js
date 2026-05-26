const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();
const app = express();

const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, health checks).
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.trim().replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'mcad-backend' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/events', require('./routes/events'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Global error handler
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Uploaded image is too large.' });
  }
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

const bootstrapAdminFromEnv = async () => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'System Administrator';

  if (!email || !password) return;

  const existing = await User.findOne({ email });
  if (existing) {
    existing.name = name;
    existing.role = 'admin';
    existing.status = 'active';
    existing.password = password;
    await existing.save();
    console.log(`Admin bootstrap updated: ${email}`);
    return;
  }

  await User.create({
    name,
    email,
    password,
    role: 'admin',
    status: 'active',
    barangay: 'MCAD',
  });
  console.log(`Admin bootstrap created: ${email}`);
};

const startServer = async () => {
  await connectDB();
  await bootstrapAdminFromEnv();
  const server = app.listen(PORT, () => console.log(`MCAD server running on port ${PORT}`));
  server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other server process or set a different PORT in your .env.`);
      process.exit(1);
    }
    throw err;
  });
};

startServer().catch((err) => {
  console.error(`Server startup error: ${err.message}`);
  process.exit(1);
});
