from sqlalchemy import Column, Integer, String
from app.core.database import Base


class StoreSettings(Base):
    __tablename__ = "store_settings"

    id = Column(Integer, primary_key=True, default=1)
    store_name = Column(String(160), nullable=False, default="AI Store")
    contact_email = Column(String(255), nullable=False, default="")
    contact_phone = Column(String(40), nullable=False, default="")
    address = Column(String(500), nullable=False, default="")
