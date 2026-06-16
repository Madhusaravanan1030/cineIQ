#!/bin/bash
# ─────────────────────────────────────────────
#  Render startup script for cineIQ ML service
# ─────────────────────────────────────────────

echo "Setting up cineIQ ML service..."

# Move into the ml-service directory
# Render runs this from the repo root, not ml-service/
cd /opt/render/project/src/ml-service

# Create data directory
mkdir -p data

# Download TMDB dataset from Kaggle
echo "Downloading TMDB dataset from Kaggle..."
kaggle datasets download -d tmdb/tmdb-movie-metadata -p data --unzip

# Prepare merged CSV
echo "Preparing dataset..."
python prepare_data.py

# Start FastAPI — $PORT is provided by Render automatically
echo "Starting ML service on port $PORT..."
uvicorn main:app --host 0.0.0.0 --port $PORT
