const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// ─────────────────────────────────────────────
//  What is middleware?
//
//  Middleware is a function that sits BETWEEN the
//  incoming request and your route handler.
//
//  Every Express middleware receives:
//    req  — the request object (headers, body, params)
//    res  — the response object (send data back)
//    next — a function to pass control to the NEXT middleware
//
//  Flow with this middleware:
//    Request → authMiddleware (verify token) → route handler
//
//  If token is invalid → authMiddleware sends 401 error
//  If token is valid   → authMiddleware calls next() → route runs
// ─────────────────────────────────────────────

const protect = async (req, res, next) => {
  let token;

  // JWT tokens are sent in the Authorization header like:
  //   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
  // We extract just the token part (after "Bearer ")
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      error: "Not authorized — no token provided. Please log in.",
    });
  }

  try {
    // jwt.verify checks:
    //   1. The token signature (was it signed with our secret?)
    //   2. The expiry (has it expired?)
    // If either check fails, it throws an error → caught below
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded looks like: { userId: "64abc...", iat: 1234567890, exp: ... }

    // Attach the full user object to req so route handlers can use it
    // We exclude the password field with .select("-password")
    req.user = await User.findById(decoded.userId).select("-password");

    if (!req.user) {
      return res.status(401).json({ error: "User no longer exists." });
    }

    next(); // token valid — proceed to the route handler

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired. Please log in again." });
    }
    return res.status(401).json({ error: "Invalid token. Please log in again." });
  }
};

module.exports = { protect };