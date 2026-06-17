// Replace the search route in backend/routes/movies.js
// Find this section:
// router.get("/search", async (req, res) => {
// and replace the whole function with this:

router.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    const page  = parseInt(req.query.page) || 1;  // ← add page support

    if (!query || query.trim().length < 1) {
      return res.status(400).json({ error: "Search query is required." });
    }

    const response = await withRetry(() =>
      tmdb.get("/search/movie", {
        params: { query, page },  // ← pass page to TMDB
      })
    );

    const movies = response.data.results
      .filter((m) => m.poster_path)
      .map(formatMovie);

    res.json({
      movies,
      total:        response.data.total_results,
      total_pages:  response.data.total_pages,   // ← return total pages
      current_page: response.data.page,
    });
  } catch (err) {
    console.error("TMDB search error:", err.message);
    res.status(500).json({ error: "Search failed. Please try again." });
  }
});