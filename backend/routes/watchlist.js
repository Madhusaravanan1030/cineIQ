const express  = require("express");
const User     = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All watchlist routes require login — apply protect middleware
// to the whole router instead of each route individually
router.use(protect);

// ─────────────────────────────────────────────
//  GET /api/watchlist
//  Get the current user's full watchlist
// ─────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    // req.user is set by the protect middleware
    // .watchlist is the array we defined in User schema
    const watchlist = req.user.watchlist.sort(
      (a, b) => new Date(b.addedAt) - new Date(a.addedAt) // newest first
    );

    // Calculate stats for the watchlist page header cards
    const total   = watchlist.length;
    const watched = watchlist.filter((m) => m.watched).length;
    const toWatch = total - watched;
    const avgRating = total > 0
      ? (watchlist.reduce((sum, m) => sum + (m.vote_average || 0), 0) / total).toFixed(1)
      : 0;

    res.json({
      watchlist,
      stats: { total, watched, toWatch, avgRating },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch watchlist." });
  }
});

// ─────────────────────────────────────────────
//  POST /api/watchlist
//  Add a movie to the watchlist
//
//  Request body:
//  { tmdb_id, title, poster_path, vote_average, genre, year }
// ─────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { tmdb_id, title, poster_path, vote_average, genre, year } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Movie title is required." });
    }

    // Check if already in watchlist (by title or tmdb_id)
    const alreadyAdded = req.user.watchlist.some(
      (m) => m.title === title || (tmdb_id && m.tmdb_id === tmdb_id)
    );

    if (alreadyAdded) {
      return res.status(400).json({ error: "Movie is already in your watchlist." });
    }

    // Push new movie to the watchlist array in MongoDB
    // $push adds an item to an array field without loading the full document
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        watchlist: { tmdb_id, title, poster_path, vote_average, genre, year },
      },
    });

    res.status(201).json({ message: `"${title}" added to watchlist.` });

  } catch (err) {
    res.status(500).json({ error: "Failed to add to watchlist." });
  }
});

// ─────────────────────────────────────────────
//  PATCH /api/watchlist/:movieId/watched
//  Toggle the watched status of a movie
// ─────────────────────────────────────────────
router.patch("/:movieId/watched", async (req, res) => {
  try {
    const { movieId } = req.params;

    // Find the movie in the watchlist subdocument array
    const user = await User.findById(req.user._id);
    const movie = user.watchlist.id(movieId); // Mongoose subdoc .id() method

    if (!movie) {
      return res.status(404).json({ error: "Movie not found in watchlist." });
    }

    // Toggle watched status
    movie.watched = !movie.watched;
    await user.save();

    res.json({
      message: movie.watched
        ? `"${movie.title}" marked as watched.`
        : `"${movie.title}" marked as unwatched.`,
      watched: movie.watched,
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to update watched status." });
  }
});

// ─────────────────────────────────────────────
//  DELETE /api/watchlist/:movieId
//  Remove a movie from the watchlist
// ─────────────────────────────────────────────
router.delete("/:movieId", async (req, res) => {
  try {
    const { movieId } = req.params;

    // $pull removes a specific subdocument from array by its _id
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { watchlist: { _id: movieId } },
    });

    res.json({ message: "Movie removed from watchlist." });

  } catch (err) {
    res.status(500).json({ error: "Failed to remove from watchlist." });
  }
});

module.exports = router;