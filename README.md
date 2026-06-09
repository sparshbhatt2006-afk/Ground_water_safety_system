# AquaWatch — Water Quality Intelligence Platform

Integrated water quality monitoring system combining ML-based risk prediction with the Water Risk Portal for automated alerting.

## Architecture

```
React Frontend (Vite) → Express.js Backend → Python ML Pipeline
                                            → Water Risk Portal (webhook)
```

## Quick Start

### 1. Train the ML Model (one-time)
```bash
cd ml_pipeline
pip install -r requirements.txt
python train.py
python batch_predict.py
```

### 2. Start the Backend
```bash
cd backend
npm install
node server.js
# Server runs on http://localhost:3001
```

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

## Project Structure

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `ml_pipeline/` | Python (sklearn) | ML model training, prediction API bridge |
| `backend/` | Node.js (Express) | REST API, webhook proxy |
| `frontend/` | React (Vite) | Dashboard UI |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/lakes` | All lakes with predictions |
| `GET` | `/api/stats` | Dashboard statistics |
| `POST` | `/api/predict` | ML prediction |
| `POST` | `/api/predict-and-alert` | Predict + auto-alert |
| `POST` | `/api/webhook/trigger` | Send to Water Risk Portal |

## Water Risk Portal Integration

High-risk predictions automatically trigger webhook to:
`POST https://water-risk-portal.onrender.com/report/risk`
