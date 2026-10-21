"""
Standalone script to train and evaluate recommendation models on historical transactions.
Can be run as a cron job or background worker.
"""

from app.core.database import SessionLocal
from app.ai_engine.data_pipeline import sync_recommender_data


def run_training():
    print("[AI Engine] Starting recommender model training pipeline...")
    db = SessionLocal()
    try:
        sync_recommender_data(db)
        print("[AI Engine] Recommender training completed successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    run_training()
