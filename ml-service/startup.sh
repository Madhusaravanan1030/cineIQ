#!/bin/bash
# ─────────────────────────────────────────────
#  Render startup script for cineIQ ML service
# ─────────────────────────────────────────────

echo "Setting up cineIQ ML service..."

# Move into the ml-service directory
cd /opt/render/project/src/ml-service

# Create data directory
mkdir -p data

# Download TMDB dataset from Kaggle
echo "Downloading TMDB dataset from Kaggle..."
kaggle datasets download -d tmdb/tmdb-movie-metadata -p data --unzip

# Prepare merged CSV
echo "Preparing dataset..."
python prepare_data.py

# Start FastAPI server
echo "Starting ML service on port $PORT..."
uvicorn Main:app --host 0.0.0.0 --port $PORT