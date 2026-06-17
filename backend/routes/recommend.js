const express = require("express");
const axios   = require("axios");

const router = express.Router();

const tmdb = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  params:  { api_key: process.env.TMDB_API_KEY },
  timeout: 10000,
});

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

const enrichWithTMDB = async (result) => {
  try {
    const response = await tmdb.get("/search/movie", {
      params: { query: result.title, page: 1 },
    });
    const results = response.data.results;
    if (!results || results.length === 0) return buildFallback(result);
    const exact = results.find(
      (m) => m.title?.toLowerCase() === result.title.toLowerCase()
    );
    const movie = exact || results.reduce((best, m) =>
      (m.vote_count > best.vote_count ? m : best)
    );
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
//  TMDB fallback — used when:
//  1. Movie not in ML dataset (post-2016 films)
//  2. ML similarity scores too low (weak data)
//  3. ML service is down
//
//  Uses TMDB's /movie/:id/similar endpoint which
//  covers their ENTIRE database of 900,000+ movies
// ─────────────────────────────────────────────
const getTMDBRecommendations = async (title, top_n) => {
  try {
    // Find movie TMDB ID
    const searchRes = await tmdb.get("/search/movie", {
      params: { query: title, page: 1 },
    });
    const results = searchRes.data.results;
    if (!results || results.length === 0) return null;

    // Use most popular match (highest vote_count)
    const movie = results.reduce((best, m) =>
      ((m.vote_count || 0) > (best.vote_count || 0) ? m : best)
    );

    // Try /similar first
    let movies = [];
    try {
      const simRes = await tmdb.get(`/movie/${movie.id}/similar`);
      movies = simRes.data.results.filter(m => m.poster_path);
    } catch {}

    // If similar is empty try /recommendations
    if (movies.length < 3) {
      try {
        const recRes = await tmdb.get(`/movie/${movie.id}/recommendations`);
        movies = recRes.data.results.filter(m => m.poster_path);
      } catch {}
    }

    if (movies.length === 0) return null;

    return movies.slice(0, top_n).map((m, i) => ({
      title:            m.title,
      match_percent:    Math.max(97 - i * 5, 60),
      similarity_score: null,
      source:           "tmdb",
      tmdb_id:          m.id,
      poster_path:      `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      vote_average:     parseFloat(m.vote_average?.toFixed(1)) || 0,
      year:             m.release_date
        ? parseInt(m.release_date.split("-")[0])
        : null,
      genre_ids:        m.genre_ids || [],
    }));

  } catch (err) {
    console.error("TMDB fallback error:", err.message);
    return null;
  }
};

// ─────────────────────────────────────────────
//  POST /api/recommend
// ─────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { title, top_n = 6 } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Movie title is required." });
    }

    // Step 1 — Try Python ML
    let mlResults = null;
    try {
      const mlResponse = await axios.post(`${ML_URL}/recommend`, {
        title, top_n,
      }, { timeout: 15000 });

      // Only trust ML results with decent similarity (> 0.05)
      // Below this = movie has almost no data in the 2016 dataset
      const validResults = mlResponse.data.recommendations.filter(
        r => r.similarity_score > 0.05
      );

      if (validResults.length >= 3) {
        mlResults = validResults;
        console.log(`ML: ${mlResults.length} results for "${title}"`);
      } else {
        console.log(`ML weak for "${title}" (best score: ${mlResponse.data.recommendations[0]?.similarity_score}) → TMDB fallback`);
      }
    } catch (mlErr) {
      console.log(`ML unavailable: ${mlErr.message} → TMDB fallback`);
    }

    // Step 2 — Use ML results or fall back to TMDB
    let recommendations;
    if (mlResults && mlResults.length >= 3) {
      recommendations = await Promise.all(mlResults.map(enrichWithTMDB));
      recommendations = recommendations.map(r => ({ ...r, source: "ml" }));
    } else {
      recommendations = await getTMDBRecommendations(title, top_n);
      if (!recommendations || recommendations.length === 0) {
        return res.status(404).json({
          error: `No recommendations found for "${title}". Try the exact movie title.`,
        });
      }
    }

    res.json({
      query:           title,
      count:           recommendations.length,
      source:          recommendations[0]?.source || "ml",
      recommendations,
    });

  } catch (err) {
    console.error("Recommend error:", err.message);
    res.status(500).json({ error: "Failed to get recommendations." });
  }
});

module.exports = router;