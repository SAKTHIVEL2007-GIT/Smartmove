"""
SafeCity Loop V2 — FastAPI Main Entry Point
⚠️  DEMO DATA — Not real municipal data ⚠️
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from backend.database import Base, engine, SessionLocal
import backend.models  # Ensures all ORM models are registered with Base.metadata
from backend.routers import (
    dashboard, roads, hazards, danger_zones, repair,
    junctions, interventions, reports, ai_vision, routes
)
from backend.seed import seed_all

# Create all database tables
Base.metadata.create_all(bind=engine)

# Ensure upload directories exist
os.makedirs("uploads/potholes", exist_ok=True)
os.makedirs("uploads/traffic", exist_ok=True)
os.makedirs("models", exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed demo data on startup
    db = SessionLocal()
    try:
        seed_all(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="SafeCity Loop API",
    description="AI-powered urban road-safety platform — Part 1 & 2 AI Vision\n\n⚠️ All data is DEMO DATA — not real municipal data.",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads directory for original and processed visual media
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register API routers
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(roads.router, prefix="/api", tags=["Roads"])
app.include_router(hazards.router, prefix="/api", tags=["Hazards"])
app.include_router(danger_zones.router, prefix="/api", tags=["Danger Zones"])
app.include_router(repair.router, prefix="/api", tags=["Repairs"])
app.include_router(junctions.router, prefix="/api", tags=["Junctions"])
app.include_router(interventions.router, prefix="/api", tags=["Interventions"])
app.include_router(reports.router, prefix="/api", tags=["Reports"])
app.include_router(ai_vision.router, prefix="/api", tags=["AI Vision"])
app.include_router(routes.router, prefix="/api", tags=["Routes"])


@app.get("/", tags=["Health"])
def root():
    return {
        "name": "SafeCity Loop API",
        "status": "running",
        "version": "2.0.0",
        "vision_pipeline": "local_yolov8",
        "note": "⚠️ DEMO DATA — not real municipal data",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
