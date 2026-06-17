const express = require("express");
const axios   = require("axios");

const router = express.Router();

const tmdb = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  params:  { api_key: process.env.TMDB_API_KEY },
  timeout: 10000,
});

const withRetry = async (fn, retries = 3, delayMs = 500) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable =
        err.code === "ECONNRESET"   ||
        err.code === "ECONNABORTED" ||
        err.code === "ETIMEDOUT"    ||
        (err.response && err.response.status >= 500);
      if (!isRetryable || attempt === retries) throw err;
      console.log(`TMDB retry ${attempt}/${retries} (${err.code})...`);
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
};

const formatMovie = (movie) => ({
  tmdb_id:           movie.id,
  title:             movie.title || movie.original_title,
  overview:          movie.overview || "",
  original_language: movie.original_language || "en",
  poster_path:       movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null,
  backdrop_path:     movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null,
  vote_average:      movie.vote_average || 0,
  vote_count:        movie.vote_count   || 0,
  popularity:        movie.popularity   || 0,
  release_date:      movie.release_date || "",
  year:              movie.release_date
    ? parseInt(movie.release_date.split("-")[0])
    : null,
  runtime:           movie.runtime || null,
  genre_ids:         movie.genre_ids || [],
  genres:            movie.genres ? movie.genres.map((g) => g.name) : [],
});

// ─────────────────────────────────────────────
//  GET /api/movies/trending
// ─────────────────────────────────────────────
router.get("/trending", async (req, res) => {
  try {
    const response = await withRetry(() => tmdb.get("/trending/movie/week"));
    const movies   = response.data.results.map(formatMovie);
    res.json({ movies });
  } catch (err) {
    console.error("TMDB trending error:", err.message);
    res.status(500).json({ error: "Failed to fetch trending movies.", code: err.code });
  }
});

// ─────────────────────────────────────────────
//  GET /api/movies/search?q=inception&page=1
// ─────────────────────────────────────────────
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    const page  = parseInt(req.query.page) || 1;

    if (!query || query.trim().length < 1) {
      return res.status(400).json({ error: "Search query is required." });
    }

    const response = await withRetry(() =>
      tmdb.get("/search/movie", { params: { query, page } })
    );

    const movies = response.data.results
      .filter((m) => m.poster_path)
      .map(formatMovie);

    res.json({
      movies,
      total:        response.data.total_results,
      total_pages:  response.data.total_pages,
      current_page: response.data.page,
    });
  } catch (err) {
    console.error("TMDB search error:", err.message);
    res.status(500).json({ error: "Search failed. Please try again." });
  }
});

// ─────────────────────────────────────────────
//  GET /api/movies/discover
// ─────────────────────────────────────────────
router.get("/discover", async (req, res) => {
  try {
    const {
      year, genre, language,
      runtime_min, runtime_max,
      sort_by = "popularity.desc",
      page = 1,
    } = req.query;

    const params = {
      sort_by,
      page,
      "vote_count.gte": 50,
    };

    if (year)        params["primary_release_year"] = year;
    if (genre)       params["with_genres"]           = genre;
    if (language)    params["with_original_language"] = language;
    if (runtime_min) params["with_runtime.gte"]      = runtime_min;
    if (runtime_max) params["with_runtime.lte"]      = runtime_max;

    const response = await withRetry(() =>
      tmdb.get("/discover/movie", { params })
    );

    const movies = response.data.results
      .filter((m) => m.poster_path)
      .map(formatMovie);

    res.json({
      movies,
      total:        response.data.total_results,
      total_pages:  response.data.total_pages,
      current_page: response.data.page,
    });
  } catch (err) {
    console.error("TMDB discover error:", err.message);
    res.status(500).json({ error: "Failed to discover movies." });
  }
});

// ─────────────────────────────────────────────
//  GET /api/movies/genres
// ─────────────────────────────────────────────
router.get("/genres", async (req, res) => {
  try {
    const response = await withRetry(() => tmdb.get("/genre/movie/list"));
    res.json({ genres: response.data.genres });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch genres." });
  }
});

// ─────────────────────────────────────────────
//  GET /api/movies/:id
// ─────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const response = await withRetry(() =>
      tmdb.get(`/movie/${id}`, {
        params: { append_to_response: "credits" },
      })
    );
    const movie = response.data;
    const cast  = movie.credits?.cast?.slice(0, 6).map((person) => ({
      id:           person.id,
      name:         person.name,
      character:    person.character,
      profile_path: person.profile_path
        ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
        : null,
      initials: person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
    })) || [];
    const director = movie.credits?.crew?.find((p) => p.job === "Director");
    res.json({
      movie: {
        ...formatMovie(movie),
        runtime:    movie.runtime,
        tagline:    movie.tagline,
        genres:     movie.genres?.map((g) => g.name) || [],
        cast,
        director:   director ? director.name : null,
        box_office: movie.revenue > 0
          ? `$${(movie.revenue / 1_000_000).toFixed(0)}M`
          : "N/A",
      },
    });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: "Movie not found." });
    }
    console.error("TMDB movie detail error:", err.message);
    res.status(500).json({ error: "Failed to fetch movie details." });
  }
});

module.exports = router;