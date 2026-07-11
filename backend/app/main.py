from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Explain It Back API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:3000", "http://localhost:19006"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}
