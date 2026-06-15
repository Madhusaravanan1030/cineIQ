import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os
import ast

# ─────────────────────────────────────────────
#  STEP 1 — Load and clean the dataset
#
#  We load the CSV once when the server starts.
#  NOT on every request — that would be very slow.
#  Python keeps it in memory for the lifetime of
#  the server process.
# ─────────────────────────────────────────────

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "movies.csv")

def load_data():
    """
    Load movies.csv and return a cleaned DataFrame.
    
    Expected CSV columns (TMDB 5000 dataset after merge):
      id_x or movie_id, title, overview, genres, keywords,
      cast, crew, popularity, vote_average, vote_count
    """
    df = pd.read_csv(DATA_PATH)

    # Handle pandas renaming id → id_x after merge
    if "id_x" in df.columns:
        df.rename(columns={"id_x": "movie_id"}, inplace=True)

    # Keep only the columns we need
    df = df[["movie_id", "title", "overview", "genres",
             "keywords", "cast", "crew",
             "vote_average", "vote_count", "popularity"]].copy()

    # Drop rows where title or genres/keywords are missing
    # (movies with no metadata give bad recommendations)
    df.dropna(subset=["title"], inplace=True)

    # Fill missing text fields with empty string
    df.fillna("", inplace=True)

    # CRITICAL: reset index so row 0 = matrix row 0
    # After merge + dropna the index has gaps (e.g. 0,1,3,5...)
    # tfidf_matrix row numbers are 0,1,2,3... (no gaps)
    # If we use the original index to slice the matrix we get
    # the WRONG movie vector — this was causing the bad scores
    df.reset_index(drop=True, inplace=True)

    return df


def parse_json_column(value):
    """
    TMDB CSV stores genres/cast/keywords as JSON strings like:
      '[{"id": 28, "name": "Action"}, {"id": 12, "name": "Adventure"}]'
    
    This function converts that string into a plain Python list:
      ["Action", "Adventure"]
    
    We use ast.literal_eval (safer than eval) to parse it.
    """
    try:
        items = ast.literal_eval(value)  # parse string → Python list of dicts
        return [item["name"] for item in items]
    except Exception:
        return []


def get_director(crew_value):
    """
    Extract just the director's name from the crew JSON string.
    Director has the most influence on a film's style,
    so including them improves recommendations.
    """
    try:
        crew = ast.literal_eval(crew_value)
        for person in crew:
            if person.get("job") == "Director":
                # Replace spaces with underscores so "Christopher Nolan"
                # becomes "ChristopherNolan" — treated as ONE token by TF-IDF
                return person["name"].replace(" ", "")
        return ""
    except Exception:
        return ""


def get_top_cast(cast_value, top=3):
    """
    Get the top 3 cast members.
    We only use 3 because a movie with 50 cast members
    shouldn't be dominated by actor similarity.
    """
    try:
        cast = ast.literal_eval(cast_value)
        # Replace spaces: "Leonardo DiCaprio" → "LeonardoDiCaprio"
        return [person["name"].replace(" ", "") for person in cast[:top]]
    except Exception:
        return []


def build_tags(row):
    """
    Combine all features into a single text string called "tags".
    This is the text that TF-IDF will vectorize.
    
    Example output for Inception:
      "scifi scifi thriller thriller action action
       mind-bending heist dream subconscious ...
       LeonardoDiCaprio LeonardoDiCaprio JosephGordonLevitt
       ChristopherNolan ChristopherNolan ChristopherNolan
       a thief who steals corporate secrets..."
    
    Repetition = higher TF-IDF weight for that feature.
    Director repeated 3x because it's the strongest signal
    for recommendation quality (all Nolan films feel similar).
    """
    genres   = parse_json_column(row["genres"])
    keywords = parse_json_column(row["keywords"])
    cast     = get_top_cast(row["cast"])
    director = get_director(row["crew"])
    overview = row["overview"].split()

    # Weight each feature by repeating it:
    # director ×3 — strongest stylistic signal
    # genres   ×2 — second most important
    # keywords ×2 — specific themes/topics
    # cast     ×1 — supporting signal
    # overview ×1 — general description
    tags = (
        [director] * 3 +
        genres * 2 +
        keywords * 2 +
        cast +
        overview
    )

    # Remove spaces within each token so "Science Fiction"
    # becomes "ScienceFiction" — one token, not two separate words
    cleaned = [t.replace(" ", "").replace("-", "") for t in tags if t]

    return " ".join(cleaned).lower()


# ─────────────────────────────────────────────
#  STEP 2 — Build the TF-IDF matrix
#
#  TF-IDF = Term Frequency × Inverse Document Frequency
#
#  TF: how often a word appears in THIS movie's tags
#  IDF: how rare that word is across ALL movies
#
#  Result: common words like "the", "a", "and" get
#  low scores. Unique words like "dream", "heist",
#  "nolan" get high scores.
#
#  The output is a matrix where:
#    - Each ROW = one movie
#    - Each COLUMN = one unique word
#    - Each VALUE = TF-IDF score of that word for that movie
# ─────────────────────────────────────────────

print("Loading movie dataset...")
df = load_data()

print("Building tags from genres, keywords, cast, director, overview...")
df["tags"] = df.apply(build_tags, axis=1)

print("Fitting TF-IDF vectorizer...")
tfidf = TfidfVectorizer(
    max_features=5000,   # limit vocabulary to top 5000 words
    stop_words="english" # remove common English words (the, a, is, etc.)
)
tfidf_matrix = tfidf.fit_transform(df["tags"])
# Shape: (4800 movies, 5000 words) — a matrix of numbers

print(f"Dataset ready: {len(df)} movies loaded.")
print("ML service is ready to serve recommendations!")


# ─────────────────────────────────────────────
#  STEP 3 — Cosine similarity function
#
#  Cosine similarity measures the ANGLE between
#  two vectors (not the distance).
#
#  Range: 0.0 (completely different) → 1.0 (identical)
#
#  Why angle and not distance?
#  A long movie overview and a short one have different
#  vector magnitudes, but if they talk about the same
#  topics, the angle between them is small → high similarity.
# ─────────────────────────────────────────────

def get_recommendations(title: str, top_n: int = 10):
    """
    Given a movie title, return top_n most similar movies.
    
    Returns a list of dicts:
    [
      { "title": "The Dark Knight", "similarity_score": 0.94, "match_percent": 94 },
      { "title": "Batman Begins",   "similarity_score": 0.88, "match_percent": 88 },
      ...
    ]
    
    Returns None if the title is not found.
    """
    # Find the movie in our dataframe (case-insensitive)
    matches = df[df["title"].str.lower() == title.lower()]

    if matches.empty:
        # Try partial match as fallback
        matches = df[df["title"].str.lower().str.contains(title.lower())]
        if matches.empty:
            return None  # FastAPI will convert this to a 404

    # Get the POSITIONAL index (0, 1, 2...) not the DataFrame label index
    # This is critical — after reset_index(), iloc position == matrix row number
    # matches.index[0] gives the DataFrame label (same as position after reset)
    # but using .index gives us the correct positional row for tfidf_matrix
    movie_pos = df.index.get_loc(matches.index[0])

    # Compute cosine similarity between THIS movie and ALL movies
    movie_vector = tfidf_matrix[movie_pos]
    similarity_scores = cosine_similarity(movie_vector, tfidf_matrix).flatten()

    # Get indices sorted by score (highest first)
    sorted_indices = np.argsort(similarity_scores)[::-1]

    # Scale match_percent relative to the top score in results
    # Raw cosine scores for text are rarely above 0.5
    # We scale them so the best match shows as ~97% not 26%
    # Find max score excluding the movie itself
    top_score = max(
        similarity_scores[i] for i in sorted_indices if i != movie_pos
    ) if len(sorted_indices) > 1 else 1.0

    results = []
    for idx in sorted_indices:
        if idx == movie_pos:
            continue  # skip the movie itself
        if len(results) >= top_n:
            break

        score = float(similarity_scores[idx])
        movie = df.iloc[idx]

        # Scale: best match → ~97%, others proportionally lower
        # This makes the UI match % feel meaningful (like your design shows)
        scaled_percent = int((score / top_score) * 97) if top_score > 0 else 0
        scaled_percent = max(1, min(scaled_percent, 97))  # clamp to 1–97

        results.append({
            "title":            movie["title"],
            "similarity_score": round(score, 4),
            "match_percent":    scaled_percent,
            "vote_average":     float(movie["vote_average"]),
            "popularity":       float(movie["popularity"]),
        })

    return results


def search_movies(query: str, limit: int = 20):
    """
    Simple title search — returns movies whose title
    contains the query string (case-insensitive).
    Used by the search bar before calling /recommend.
    """
    mask = df["title"].str.lower().str.contains(query.lower(), na=False)
    results = df[mask].head(limit)

    return [
        {
            "title":        row["title"],
            "vote_average": float(row["vote_average"]),
            "popularity":   float(row["popularity"]),
        }
        for _, row in results.iterrows()
    ]


def get_movie_list():
    """
    Return all movie titles sorted by popularity.
    Used by the home page to show trending movies.
    """
    sorted_df = df.sort_values("popularity", ascending=False)
    return [
        {
            "title":        row["title"],
            "vote_average": float(row["vote_average"]),
            "popularity":   float(row["popularity"]),
        }
        for _, row in sorted_df.head(100).iterrows()
    ]