import json
import os
from app.core.database import SessionLocal, Base, engine
from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.core.security import get_password_hash
from app.ai_engine.data_pipeline import sync_recommender_data


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    data_file = os.path.join(os.path.dirname(__file__), "seed_data.json")
    with open(data_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Seed Admin User if not exists
    admin = db.query(User).filter(User.email == "admin@aistore.com").first()
    if not admin:
        admin = User(
            email="admin@aistore.com",
            username="admin",
            full_name="AI Store Administrator",
            hashed_password=get_password_hash("admin123"),
            is_active=True,
            is_admin=True,
        )
        db.add(admin)
        print("Created default admin user: admin@aistore.com / admin123")

    # Seed Categories
    category_map = {}
    for cat in data["categories"]:
        existing = db.query(Category).filter(Category.slug == cat["slug"]).first()
        if not existing:
            existing = Category(**cat)
            db.add(existing)
            db.flush()
        category_map[cat["slug"]] = existing.id

    # Seed Products
    for prod in data["products"]:
        existing = db.query(Product).filter(Product.name == prod["name"]).first()
        cat_id = category_map.get(prod.get("category_slug"))
        if not existing:
            product_data = {key: value for key, value in prod.items() if key != "category_slug"}
            product = Product(**product_data, category_id=cat_id)
            db.add(product)
        elif existing.image and existing.image.startswith("https://via.placeholder.com"):
            existing.image = prod["image"]
            existing.description = prod["description"]
            existing.category_id = cat_id

    db.commit()
    print("Database seeding completed.")

    # Train recommender with newly seeded products
    sync_recommender_data(db)
    print("AI Recommender engine synced.")
    db.close()


if __name__ == "__main__":
    seed()
