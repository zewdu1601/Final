from sqlalchemy.orm import Session

from app.models.order_notification import OrderNotification
from app.models.user import User


def add_order_notification(
    db: Session,
    recipient_id: int,
    order_id: int,
    title: str,
    message: str,
):
    db.add(
        OrderNotification(
            recipient_id=recipient_id,
            order_id=order_id,
            title=title,
            message=message,
        )
    )


def notify_store_staff_of_order(db: Session, order_id: int):
    staff = db.query(User).filter(
        User.is_active.is_(True),
        User.role.in_(("admin", "manager")),
    ).all()
    for user in staff:
        add_order_notification(
            db,
            user.id,
            order_id,
            "New order received",
            f"Order #{order_id} was placed and is pending stock confirmation.",
        )
