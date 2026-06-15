const express = require("express");
const axios   = require("axios");

const router = express.Router();

const tmdb = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  params:  { api_key: process.env.TMDB_API_KEY },
  timeout: 10000,
});

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// ─────────────────────────────────────────────
//  Enrich one ML result with TMDB poster data.
//  Strategy:
//  1. Search TMDB by title
//  2. Try exact title match
//  3. If multiple exact matches, prefer the one
//     whose year matches (avoids Insomnia 1997 vs 2002)
//  4. Fall back to first result if no exact match
// ─────────────────────────────────────────────
const enrichWithTMDB = async (result) => {
  try {
    const response = await tmdb.get("/search/movie", {
      params: { query: result.title, page: 1 },
    });

    const results = response.data.results;
    if (!results || results.length === 0) return buildFallback(result);

    // Filter to exact title matches only
    const exactMatches = results.filter(
      (m) => m.title?.toLowerCase() === result.title.toLowerCase()
    );

    let movie;
    if (exactMatches.length === 1) {
      // Only one exact match — use it
      movie = exactMatches[0];
    } else if (exactMatches.length > 1) {
      // Multiple exact matches (e.g. Insomnia 1997 + 2002)
      // Pick the one with highest vote_count — most well known version
      movie = exactMatches.reduce((best, m) =>
        (m.vote_count > best.vote_count ? m : best)
      );
    } else {
      // No exact match — use first result
      movie = results[0];
    }

    return {
      title:            movie.title,
      match_percent:    result.match_percent,
      similarity_score: result.similarity_score,
      tmdb_id:          movie.id,
      poster_path:      movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      vote_average:     parseFloat(movie.vote_average?.toFixed(1)) || result.vote_average,
      year:             movie.release_date
        ? parseInt(movie.release_date.split("-")[0])
        : null,
      genre_ids:        movie.genre_ids || [],
    };
  } catch {
    return buildFallback(result);
  }
};

const buildFallback = (result) => ({
  title:            result.title,
  match_percent:    result.match_percent,
  similarity_score: result.similarity_score,
  tmdb_id:          null,
  poster_path:      null,
  vote_average:     result.vote_average,
  year:             null,
  genre_ids:        [],
});

// ─────────────────────────────────────────────
//  POST /api/recommend
// ─────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { title, top_n = 6 } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Movie title is required." });
    }

    // Step 1 — Get ML recommendations
    let mlResults;
    try {
      const mlResponse = await axios.post(`${ML_URL}/recommend`, {
        title,
        top_n,
      }, { timeout: 15000 });
      mlResults = mlResponse.data.recommendations;
    } catch (mlErr) {
      if (mlErr.response?.status === 404) {
        return res.status(404).json({
          error: `"${title}" not found in dataset. Try searching for it first.`,
        });
      }
      return res.status(503).json({
        error: "Recommendation engine unavailable. Make sure Python ML service is running on port 8000.",
      });
    }

    // Step 2 — Enrich all results with TMDB data in parallel
    const enriched = await Promise.all(mlResults.map(enrichWithTMDB));

    res.json({
      query:           title,
      count:           enriched.length,
      recommendations: enriched,
    });

  } catch (err) {
    console.error("Recommend route error:", err.message);
    res.status(500).json({ error: "Failed to get recommendations." });
  }
});

module.exports = router;