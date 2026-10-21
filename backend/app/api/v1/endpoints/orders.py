from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.order import Order, OrderItem
from app.models.order_notification import OrderNotification
from app.models.product import Product
from app.schemas.order import OrderOut, OrderCreate, OrderNotificationOut
from app.api.deps import get_current_user
from app.services.order_notifications import add_order_notification, notify_store_staff_of_order

router = APIRouter()


@router.get("/", response_model=List[OrderOut])
def get_user_orders(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Order).filter(Order.user_id == current_user.id).all()


@router.get("/notifications", response_model=List[OrderNotificationOut])
def get_order_notifications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return (
        db.query(OrderNotification)
        .filter(OrderNotification.recipient_id == current_user.id)
        .order_by(OrderNotification.created_at.desc(), OrderNotification.id.desc())
        .limit(100)
        .all()
    )


@router.patch("/notifications/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_order_notifications_read(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db.query(OrderNotification).filter(
        OrderNotification.recipient_id == current_user.id,
        OrderNotification.read_at.is_(None),
    ).update({OrderNotification.read_at: func.now()}, synchronize_session=False)
    db.commit()


@router.get("/{order_id}", response_model=OrderOut)
def get_user_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    quantities = {}
    for item in order_in.items:
        quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity

    products = {}
    for product_id, quantity in quantities.items():
        product = db.query(Product).filter(Product.id == product_id).with_for_update().first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {product_id} was not found")
        available_stock = product.stock or 0
        if available_stock < quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for {product.name}; {available_stock} remaining",
            )
        products[product_id] = product

    total = round(sum(products[item.product_id].price * item.quantity for item in order_in.items), 2)
    order = Order(
        user_id=current_user.id,
        total_amount=total,
        shipping_address=order_in.shipping_address,
        payment_method=order_in.payment_method,
        status="Pending",
        payment_status="Pending",
    )
    db.add(order)
    db.flush()

    for item in order_in.items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=products[item.product_id].price,
        )
        db.add(order_item)

    for product_id, quantity in quantities.items():
        products[product_id].stock = (products[product_id].stock or 0) - quantity

    add_order_notification(
        db,
        current_user.id,
        order.id,
        "Order placed",
        f"Your order #{order.id} was submitted and is pending store confirmation.",
    )
    notify_store_staff_of_order(db, order.id)
    db.commit()
    db.refresh(order)
    return order
