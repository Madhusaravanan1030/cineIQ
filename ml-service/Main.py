from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from recommender import get_recommendations, get_movie_list, search_movies
import uvicorn

# ─────────────────────────────────────────────
#  App setup
# ─────────────────────────────────────────────
app = FastAPI(
    title="cineIQ ML Service",
    description="Content-based movie recommendation engine using TF-IDF + Cosine Similarity",
    version="1.0.0"
)

# Allow Node.js backend (port 5000) to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
#  Request / Response models
#  These are like Python dataclasses — FastAPI
#  auto-validates every incoming request against them.
#  If 'title' is missing → FastAPI returns 422 error
#  automatically, you don't need to check manually.
# ─────────────────────────────────────────────
class RecommendRequest(BaseModel):
    title: str        # movie title to base recommendations on
    top_n: int = 10   # how many results to return (default 10)

class SearchRequest(BaseModel):
    query: str        # search term
    limit: int = 20   # max results

# ─────────────────────────────────────────────
#  Routes
# ─────────────────────────────────────────────

@app.get("/")
def root():
    """Quick check that the service is running"""
    return {"service": "cineIQ ML", "status": "running"}


@app.get("/health")
def health():
    """
    Node.js backend calls this before using the service.
    If this returns 200, Node knows Python is ready.
    """
    return {"status": "ok"}


@app.post("/recommend")
def recommend(req: RecommendRequest):
    """
    Main recommendation endpoint.
    
    Flow:
    1. Receive a movie title from Node.js
    2. Find the movie in our dataset
    3. Compute cosine similarity against all movies
    4. Return top N most similar movie titles
    
    Node.js then takes these titles and fetches
    poster/rating/overview from TMDB API.
    """
    results = get_recommendations(req.title, req.top_n)

    if results is None:
        raise HTTPException(
            status_code=404,
            detail=f"Movie '{req.title}' not found in dataset. Try a different title."
        )

    return {
        "query": req.title,
        "count": len(results),
        "recommendations": results
        # Each result looks like:
        # { "title": "The Dark Knight", "similarity_score": 0.94, "match_percent": 94 }
    }


@app.post("/search")
def search(req: SearchRequest):
    """
    Search for movies in the dataset by title.
    Used by the frontend search bar to find exact
    movie title before calling /recommend.
    """
    results = search_movies(req.query, req.limit)
    return {
        "query": req.query,
        "count": len(results),
        "results": results
    }


@app.get("/movies")
def movies():
    """
    Return all movie titles in the dataset.
    Used to populate the home page trending section.
    """
    all_movies = get_movie_list()
    return {"count": len(all_movies), "movies": all_movies}


# ─────────────────────────────────────────────
#  Run the server (only when running directly)
#  Normal way to start: uvicorn main:app --reload --port 8000
# ─────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)