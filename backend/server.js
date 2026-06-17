const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const dotenv     = require("dotenv");

// ─────────────────────────────────────────────
//  Load environment variables from .env file
//  Must be called BEFORE anything uses process.env
//  dotenv reads .env and adds each line to process.env
//  e.g.  MONGODB_URI=mongodb://...  →  process.env.MONGODB_URI
// ─────────────────────────────────────────────
dotenv.config();

const app = express();

// ─────────────────────────────────────────────
//  Middleware — functions that run on EVERY request
//  before it reaches your route handlers
//
//  Think of middleware like security guards at a gate:
//  every request passes through them in order.
// ─────────────────────────────────────────────

// 1. CORS — allows your React app (port 3000) to call
//    this backend (port 5000). Without this the browser
//    blocks the request with "CORS policy" error.
// Replace your entire cors section in server.js with this:

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const allowed = [
      // Local development
      "http://localhost:3000",
      "http://localhost:5173",
      // All Vercel deployments for your project (preview + production)
      /\.vercel\.app$/,
      // Your custom domain if you add one later
    ];

    const isAllowed = allowed.some(pattern =>
      typeof pattern === "string"
        ? pattern === origin
        : pattern.test(origin)
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log("CORS blocked:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// 2. JSON parser — converts incoming request body
//    from raw text into a JavaScript object.
//    Without this, req.body is undefined.
app.use(express.json());

// ─────────────────────────────────────────────
//  Routes — import and register all route files
//  Each file handles one section of the API
// ─────────────────────────────────────────────
const authRoutes      = require("./routes/auth");
const movieRoutes     = require("./routes/movies");
const recommendRoutes = require("./routes/recommend");
const watchlistRoutes = require("./routes/watchlist");

app.use("/api/auth",      authRoutes);       // /api/auth/register, /api/auth/login
app.use("/api/movies",    movieRoutes);      // /api/movies/search, /api/movies/trending
app.use("/api/recommend", recommendRoutes);  // /api/recommend
app.use("/api/watchlist", watchlistRoutes);  // /api/watchlist (GET, POST, DELETE)

// ─────────────────────────────────────────────
//  Health check route
//  React app calls this to verify backend is alive
// ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "cineIQ backend" });
});

// ─────────────────────────────────────────────
//  Global error handler
//  If any route throws an error and calls next(err),
//  it lands here. Keeps error format consistent.
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// ─────────────────────────────────────────────
//  Connect to MongoDB, then start server
//
//  We connect to DB FIRST, then start listening.
//  If DB fails, we don't start the server at all —
//  no point accepting requests if we can't store data.
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cineiq";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`✅ cineIQ backend running on http://localhost:${PORT}`);
      console.log(`   Auth:      http://localhost:${PORT}/api/auth`);
      console.log(`   Movies:    http://localhost:${PORT}/api/movies`);
      console.log(`   Recommend: http://localhost:${PORT}/api/recommend`);
      console.log(`   Watchlist: http://localhost:${PORT}/api/watchlist`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    console.error("   Make sure MongoDB is running: check Services app in Windows");
    process.exit(1);  // exit — no point running without a database
  });