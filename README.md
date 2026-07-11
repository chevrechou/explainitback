# Explain It Back

A Feynman-technique learning application built with FastAPI and Expo.

## Project Structure

- `backend/` - FastAPI backend service
- `mobile/` - Expo React Native frontend

## Getting Started

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m pytest tests/ -v
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd mobile
npm install
npm start
```

## CI/CD

The project uses GitHub Actions for CI and Render for deployment. See `.github/workflows/ci.yml` and `render.yaml` for configuration.
