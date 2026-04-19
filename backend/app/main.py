from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models.models import Base
from app.routers import auth, transactions, analytics

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="WalletWizz API",
    description="AI-powered credit scoring from behavioral financial data",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {
        "message": "WalletWizz API v2 — running!",
        "docs":    "/docs",
        "limits":  "Max upload: 50 MB",
    }
