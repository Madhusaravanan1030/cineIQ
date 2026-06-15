#!/bin/bash
# ─────────────────────────────────────────────
#  Render startup script for Python ML service
#
#  Render runs this script when the service starts.
#  It downloads the dataset from Kaggle, prepares
#  it, then starts the FastAPI server.
# ─────────────────────────────────────────────

echo "Setting up cineIQ ML service..."

# Create data directory
mkdir -p data

# Download TMDB dataset from Kaggle
# Render needs KAGGLE_USERNAME and KAGGLE_KEY
# set as environment variables (we add these in Render dashboard)
echo "Downloading TMDB dataset from Kaggle..."
kaggle datasets download -d tmdb/tmdb-movie-metadata -p data --unzip

# Prepare merged CSV
echo "Preparing dataset..."
python prepare_data.py

# Start FastAPI server
echo "Starting ML service..."
uvicorn main:app --host 0.0.0.0 --port $PORT