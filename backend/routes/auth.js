const express = require("express");
const jwt     = require("jsonwebtoken");
const User    = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

// ─────────────────────────────────────────────
//  Helper — generate JWT token
//
//  jwt.sign() creates a signed token containing:
//    { userId: "64abc..." }
//
//  Anyone who has your JWT_SECRET can verify it.
//  Anyone WITHOUT the secret cannot fake a token.
//  This is how the server knows "this request is
//  really from user 64abc..."
// ─────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }   // token expires after 7 days
  );
};

// ─────────────────────────────────────────────
//  POST /api/auth/register
//  Create a new user account
//
//  Request body:
//    { "username": "vidya", "email": "v@v.com", "password": "12345678" }
//
//  Response (success):
//    { "token": "eyJ...", "user": { "id": "...", "username": "vidya", "email": "v@v.com" } }
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation — check all fields are present
    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Check if email already exists in database
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    // Check if username is taken
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: "This username is already taken." });
    }

    // Create user — password gets hashed automatically via pre-save hook
    const user = await User.create({ username, email, password });

    // Generate token for immediate login after registration
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id:       user._id,
        username: user.username,
        email:    user.email,
      },
    });

  } catch (err) {
    // Mongoose validation errors (e.g. email format invalid)
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages[0] });
    }
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// ─────────────────────────────────────────────
//  POST /api/auth/login
//  Sign in with email + password
//
//  Request body:
//    { "email": "v@v.com", "password": "12345678" }
//
//  Response (success):
//    { "token": "eyJ...", "user": { ... } }
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // Find user by email — include password field (excluded by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user) {
      // Don't say "email not found" — security risk (confirms email exists)
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Compare entered password against stored hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id:       user._id,
        username: user.username,
        email:    user.email,
      },
    });

  } catch (err) {
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ─────────────────────────────────────────────
//  GET /api/auth/me
//  Get current logged-in user's profile
//  Protected — requires valid token
//
//  React uses this on page load to check if the
//  user is still logged in (token still valid)
// ─────────────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  // req.user is set by the protect middleware
  res.json({
    user: {
      id:            req.user._id,
      username:      req.user.username,
      email:         req.user.email,
      watchlistCount: req.user.watchlist.length,
    },
  });
});

module.exports = router;