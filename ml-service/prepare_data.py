import pandas as pd

movies  = pd.read_csv("data/tmdb_5000_movies.csv")
credits = pd.read_csv("data/tmdb_5000_credits.csv")

# Rename 'movie_id' column in credits to match movies
credits.rename(columns={"movie_id": "id"}, inplace=True)

# Merge on movie title
merged = movies.merge(credits, on="title")

# Rename id column
merged.rename(columns={"id": "movie_id"}, inplace=True)

# Save merged file — this is what recommender.py reads
merged.to_csv("data/movies.csv", index=False)
print(f"Saved {len(merged)} movies to data/movies.csv")