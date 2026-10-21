from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from typing import List, Literal, Optional
from uuid import uuid4
import warnings
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from app.core.database import get_db
from app.models.user import User
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.recommendation_event import RecommendationEvent
from app.models.store_settings import StoreSettings
from app.api.deps import get_current_active_admin, get_current_store_manager
from app.schemas.order import OrderOut, OrderStatusUpdate
from app.schemas.user import (
    AdminProfileUpdate,
    AdminUserCreate,
    AdminUserUpdate,
    PasswordChange,
    StoreSettingsUpdate,
    UserOut,
)
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.ai_engine.recommender import recommender
from app.services.order_notifications import add_order_notification

router = APIRouter()


class AdminOrderOut(OrderOut):
    customer_name: str = ""
    customer_email: str = ""


@router.get("/settings")
def get_store_settings(
    db: Session = Depends(get_db),
    admin=Depends(get_current_active_admin),
):
    store_settings = db.query(StoreSettings).filter(StoreSettings.id == 1).first()
    if not store_settings:
        store_settings = StoreSettings(id=1)
        db.add(store_settings)
        db.commit()
        db.refresh(store_settings)
    return store_settings


@router.put("/settings")
def update_store_settings(
    update: StoreSettingsUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_active_admin),
):
    store_settings = db.query(StoreSettings).filter(StoreSettings.id == 1).first()
    if not store_settings:
        store_settings = StoreSettings(id=1)
        db.add(store_settings)
    for field, value in update.model_dump().items():
        setattr(store_settings, field, value or "")
    db.commit()
    db.refresh(store_settings)
    return store_settings



@router.get("/stats")
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    admin=Depends(get_current_store_manager),
):
    total_customers = db.query(User).filter(User.role == "customer").count()
    total_users = db.query(User).count() if admin.is_admin else None
    total_store_managers = db.query(User).filter(User.role == "manager").count() if admin.is_admin else None
    total_admins = db.query(User).filter(User.role == "admin", User.is_active.is_(True)).count() if admin.is_admin else None
    total_products = db.query(Product).count()
    total_stock = db.query(func.coalesce(func.sum(Product.stock), 0)).scalar() or 0
    total_orders = db.query(Order).count()
    total_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.payment_status == "Paid",
        Order.status == "Delivered",
    ).scalar() or 0.0
    low_stock_products = db.query(Product).filter(Product.stock <= 10).order_by(Product.stock.asc()).limit(8).all()
    recommendation_activity = db.query(RecommendationEvent).count() if admin.is_admin else None
    recent_recommendation_activity = db.query(RecommendationEvent).filter(
        RecommendationEvent.created_at >= datetime.now(timezone.utc) - timedelta(days=7)
    ).count() if admin.is_admin else None
    recent_orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .order_by(Order.created_at.desc())
        .limit(6)
        .all()
    )

    dashboard_data = {
        "total_customers": total_customers,
        "total_products": total_products,
        "total_stock": int(total_stock),
        "total_orders": total_orders,
        "total_revenue": round(float(total_revenue), 2),
        "low_stock_products": [
            {"id": product.id, "name": product.name, "stock": product.stock}
            for product in low_stock_products
        ],
        "recent_orders": [
            {
                "id": order.id,
                "total_amount": order.total_amount,
                "status": order.status,
                "created_at": order.created_at,
            }
            for order in recent_orders
        ],
    }
    if admin.is_admin:
        dashboard_data.update({
            "total_users": total_users,
            "total_store_managers": total_store_managers,
            "total_admins": total_admins,
            "recommendation_activity": recommendation_activity,
            "recommendation_activity_last_7_days": recent_recommendation_activity,
        })
    return dashboard_data


@router.get("/analytics")
def get_admin_analytics(
    db: Session = Depends(get_db),
    admin=Depends(get_current_store_manager),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date must be on or before end date")
    orders = db.query(Order).options(joinedload(Order.items)).order_by(Order.created_at.asc()).all()
    now = datetime.now(timezone.utc)
    if start_date or end_date:
        orders = [
            order for order in orders
            if order.created_at
            and (not start_date or order.created_at.date() >= start_date)
            and (not end_date or order.created_at.date() <= end_date)
        ]
        first_date = start_date or min((order.created_at.date() for order in orders), default=now.date())
        last_date = end_date or now.date()
        first_month = datetime(first_date.year, first_date.month, 1)
        last_month = datetime(last_date.year, last_date.month, 1)
        month_count = (last_month.year - first_month.year) * 12 + last_month.month - first_month.month
        report_months = [
            datetime(first_month.year + (first_month.month - 1 + offset) // 12,
                     (first_month.month - 1 + offset) % 12 + 1, 1)
            for offset in range(month_count + 1)
        ]
    else:
        report_months = []
        for month_offset in range(5, -1, -1):
            month_index = now.month - month_offset - 1
            year = now.year + month_index // 12
            month = month_index % 12 + 1
            report_months.append(datetime(year, month, 1))
    monthly_sales = {}
    for month in report_months:
        monthly_sales[month.strftime("%b %Y")] = 0.0

    for order in orders:
        if order.payment_status != "Paid" or order.status != "Delivered" or not order.created_at:
            continue
        month_key = order.created_at.strftime("%b %Y")
        if month_key in monthly_sales:
            monthly_sales[month_key] += order.total_amount

    paid_orders = [order for order in orders if order.payment_status == "Paid" and order.status == "Delivered"]
    paid_revenue = sum(order.total_amount for order in paid_orders)
    if start_date or end_date:
        product_totals = {}
        for order in paid_orders:
            for item in order.items:
                totals = product_totals.setdefault(item.product_id, {"units_sold": 0, "sales_value": 0.0})
                totals["units_sold"] += item.quantity
                totals["sales_value"] += item.quantity * item.price
        product_ids = list(product_totals)
        products = db.query(Product).filter(Product.id.in_(product_ids)).all() if product_ids else []
        product_sales = sorted(
            [
                {
                    "id": product.id,
                    "name": product.name,
                    **product_totals[product.id],
                }
                for product in products
            ],
            key=lambda row: row["units_sold"],
            reverse=True,
        )[:10]
    else:
        product_sales = (
            db.query(
                Product.id,
                Product.name,
                func.coalesce(func.sum(OrderItem.quantity), 0).label("units_sold"),
                func.coalesce(func.sum(OrderItem.quantity * OrderItem.price), 0).label("sales_value"),
            )
            .outerjoin(OrderItem, OrderItem.product_id == Product.id)
            .outerjoin(Order, Order.id == OrderItem.order_id)
            .filter(
                (Order.id.is_(None))
                | ((Order.status == "Delivered") & (Order.payment_status == "Paid"))
            )
            .group_by(Product.id, Product.name)
            .order_by(func.coalesce(func.sum(OrderItem.quantity), 0).desc())
            .limit(10)
            .all()
        )
    return {
        "total_revenue": round(paid_revenue, 2),
        "average_order_value": round(paid_revenue / max(len(paid_orders), 1), 2),
        "total_orders": len(orders),
        "paid_orders": len(paid_orders),
        "start_date": start_date.isoformat() if start_date else None,
        "end_date": end_date.isoformat() if end_date else None,
        "sales_by_month": [
            {"month": month, "value": round(value, 2)}
            for month, value in monthly_sales.items()
        ],
        "top_products": [
            {
                "id": row["id"] if isinstance(row, dict) else row.id,
                "name": row["name"] if isinstance(row, dict) else row.name,
                "units_sold": int(row["units_sold"] if isinstance(row, dict) else row.units_sold),
                "revenue": round(float(row["sales_value"] if isinstance(row, dict) else row.sales_value), 2),
            }
            for row in product_sales
        ],
    }


@router.get("/recommendations")
def get_recommendation_monitoring(
    db: Session = Depends(get_db),
    admin=Depends(get_current_active_admin),
):
    last_week = datetime.now(timezone.utc) - timedelta(days=7)
    by_type = (
        db.query(RecommendationEvent.event_type, func.count(RecommendationEvent.id))
        .group_by(RecommendationEvent.event_type)
        .order_by(func.count(RecommendationEvent.id).desc())
        .all()
    )
    recent_count = db.query(RecommendationEvent).filter(
        RecommendationEvent.created_at >= last_week
    ).count()
    top_requested_products = (
        db.query(
            Product.id,
            Product.name,
            func.count(RecommendationEvent.id).label("request_count"),
        )
        .join(RecommendationEvent, RecommendationEvent.product_id == Product.id)
        .filter(RecommendationEvent.event_type == "similar")
        .group_by(Product.id, Product.name)
        .order_by(func.count(RecommendationEvent.id).desc())
        .limit(10)
        .all()
    )
    recent_events = (
        db.query(RecommendationEvent, Product.name)
        .outerjoin(Product, Product.id == RecommendationEvent.product_id)
        .order_by(RecommendationEvent.created_at.desc(), RecommendationEvent.id.desc())
        .limit(20)
        .all()
    )
    model_ready = recommender.tfidf_matrix is not None
    return {
        "service_status": "ready" if model_ready else "not_ready",
        "indexed_products": len(recommender.products_df) if model_ready and recommender.products_df is not None else 0,
        "total_requests": db.query(RecommendationEvent).count(),
        "requests_last_7_days": recent_count,
        "events_by_type": [{"event_type": event_type, "count": count} for event_type, count in by_type],
        "most_requested_base_products": [
            {"id": product_id, "name": name, "request_count": request_count}
            for product_id, name, request_count in top_requested_products
        ],
        "recent_events": [
            {
                "event_type": event.event_type,
                "product_id": event.product_id,
                "product_name": product_name,
                "created_at": event.created_at,
            }
            for event, product_name in recent_events
        ],
        "error_tracking_available": False,
    }


@router.get("/reports")
def get_admin_reports(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    admin=Depends(get_current_store_manager),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=422, detail="Start date must be on or before end date")

    def apply_date_range(query, column):
        if start_date:
            start_at = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
            query = query.filter(column >= start_at)
        if end_date:
            end_at = datetime.combine(end_date + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
            query = query.filter(column < end_at)
        return query

    orders = apply_date_range(db.query(Order), Order.created_at).all()
    paid_orders = [
        order for order in orders
        if order.payment_status == "Paid" and order.status == "Delivered"
    ]
    order_statuses = {}
    for order in orders:
        order_statuses[order.status] = order_statuses.get(order.status, 0) + 1

    users_by_role = {}
    if admin.is_admin:
        users_by_role = dict(
            apply_date_range(db.query(User), User.created_at)
            .with_entities(User.role, func.count(User.id))
            .group_by(User.role)
            .all()
        )
    recommendation_types = {}
    if admin.is_admin:
        recommendation_types = dict(
            apply_date_range(db.query(RecommendationEvent), RecommendationEvent.created_at)
            .with_entities(RecommendationEvent.event_type, func.count(RecommendationEvent.id))
            .group_by(RecommendationEvent.event_type)
            .all()
        )
    sales_query = (
        db.query(
            Product.id,
            Product.name,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.quantity * OrderItem.price).label("revenue"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.payment_status == "Paid", Order.status == "Delivered")
    )
    top_products = (
        apply_date_range(sales_query, Order.created_at)
        .group_by(Product.id, Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(20)
        .all()
    )
    low_stock = (
        db.query(Product.id, Product.name, Product.stock)
        .filter(Product.stock <= 10)
        .order_by(Product.stock.asc(), Product.name.asc())
        .limit(50)
        .all()
    )
    return {
        "start_date": start_date.isoformat() if start_date else None,
        "end_date": end_date.isoformat() if end_date else None,
        "sales": {
            "paid_revenue": round(sum(float(order.total_amount) for order in paid_orders), 2),
            "paid_orders": len(paid_orders),
            "orders": len(orders),
        },
        "orders_by_status": [
            {"status": status_name, "count": count}
            for status_name, count in sorted(order_statuses.items())
        ],
        "users_by_role": [
            {"role": role_name, "count": count}
            for role_name, count in sorted(users_by_role.items())
        ],
        "total_products": db.query(Product).count(),
        "low_stock_products": [
            {"id": product_id, "name": name, "stock": stock}
            for product_id, name, stock in low_stock
        ],
        "top_products": [
            {
                "id": product_id,
                "name": name,
                "units_sold": int(units_sold or 0),
                "revenue": round(float(revenue or 0), 2),
            }
            for product_id, name, units_sold, revenue in top_products
        ],
        "recommendation_events": [
            {"event_type": event_type, "count": count}
            for event_type, count in sorted(recommendation_types.items())
        ],
    }


@router.get("/orders", response_model=List[AdminOrderOut])
def get_all_orders(
    db: Session = Depends(get_db),
    admin=Depends(get_current_store_manager),
):
    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .order_by(Order.created_at.desc())
        .all()
    )
    user_ids = {order.user_id for order in orders}
    users = {
        user.id: user
        for user in db.query(User).filter(User.id.in_(user_ids)).all()
    } if user_ids else {}
    return [
        {
            **OrderOut.model_validate(order).model_dump(),
            "customer_name": users[order.user_id].full_name or users[order.user_id].username if order.user_id in users else "",
            "customer_email": users[order.user_id].email if order.user_id in users else "",
        }
        for order in orders
    ]


@router.patch("/orders/{order_id}", response_model=AdminOrderOut)
def update_order(
    order_id: int,
    update: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_store_manager),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    status_transitions = {
        "Pending": {"Confirmed", "Cancelled"},
        "Confirmed": {"Processing", "Cancelled"},
        "Processing": {"Shipped", "Cancelled"},
        "Shipped": {"Delivered"},
        "Delivered": {"Returned"},
        "Cancelled": set(),
        "Returned": set(),
    }
    previous_status = order.status
    previous_payment_status = order.payment_status
    if update.status and update.status != previous_status:
        if update.status not in status_transitions.get(previous_status, set()):
            raise HTTPException(
                status_code=409,
                detail=f"Cannot change an order from {previous_status} to {update.status}",
            )
    if update.status == "Cancelled" and previous_status != "Cancelled":
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.stock = (product.stock or 0) + item.quantity
    if update.status is not None:
        order.status = update.status
    if update.payment_status is not None:
        order.payment_status = update.payment_status
    if update.status and update.status != previous_status:
        title, message = {
            "Confirmed": ("Order confirmed", "Your order has been confirmed by the store."),
            "Processing": ("Order being prepared", "Your order is being prepared."),
            "Shipped": ("Order shipped", "Your order has been dispatched."),
            "Delivered": ("Order delivered", "Your order has been delivered."),
            "Cancelled": ("Order cancelled", "Your order has been cancelled."),
            "Returned": ("Return status updated", "Your order return status has been updated."),
        }[update.status]
        add_order_notification(db, order.user_id, order.id, title, message)
    if update.payment_status is not None and update.payment_status != previous_payment_status:
        add_order_notification(
            db,
            order.user_id,
            order.id,
            "Payment status updated",
            f"Payment for order #{order.id} is now {update.payment_status.lower()}.",
        )
    db.commit()
    db.refresh(order)
    customer = db.query(User).filter(User.id == order.user_id).first()
    return {
        **OrderOut.model_validate(order).model_dump(),
        "customer_name": (customer.full_name or customer.username) if customer else "",
        "customer_email": customer.email if customer else "",
    }


@router.get("/profile", response_model=UserOut)
def get_admin_profile(admin: User = Depends(get_current_active_admin)):
    return admin


@router.patch("/profile", response_model=UserOut)
def update_admin_profile(
    update: AdminProfileUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin),
):
    duplicate = db.query(User).filter(
        User.id != admin.id,
        or_(func.lower(User.email) == update.email.lower(), func.lower(User.username) == update.username.lower()),
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Email or username is already in use")
    admin.full_name = update.full_name.strip()
    admin.email = update.email
    admin.username = update.username.strip()
    db.commit()
    db.refresh(admin)
    return admin


@router.post("/profile/photo", response_model=UserOut)
async def upload_admin_photo(
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin),
):
    allowed_types = {
        "image/jpeg": (b"\xff\xd8\xff", ".jpg"),
        "image/png": (b"\x89PNG\r\n\x1a\n", ".png"),
        "image/webp": (None, ".webp"),
    }
    content_type = (photo.content_type or "").lower()
    if content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Upload a JPG, PNG, or WebP image")
    contents = await photo.read(settings.MAX_PROFILE_PHOTO_BYTES + 1)
    if not contents or len(contents) > settings.MAX_PROFILE_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="Profile photos must be smaller than 5 MB")
    signature, extension = allowed_types[content_type]
    is_valid = contents.startswith(signature) if signature else (
        contents.startswith(b"RIFF") and contents[8:12] == b"WEBP"
    )
    if not is_valid:
        raise HTTPException(status_code=415, detail="The uploaded file is not a valid image of the selected type")
    expected_format = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}[content_type]
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = Image.open(BytesIO(contents))
            if image.format != expected_format:
                raise HTTPException(status_code=415, detail="Image content does not match its declared format")
            image.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning, ValueError) as error:
        raise HTTPException(status_code=415, detail="The uploaded image is invalid or exceeds safe image limits") from error

    media_root = Path(settings.MEDIA_ROOT) / "profile-photos"
    media_root.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    destination = media_root / filename
    destination.write_bytes(contents)
    old_photo = admin.photo_url
    admin.photo_url = f"/media/profile-photos/{filename}"
    try:
        db.commit()
        db.refresh(admin)
    except Exception:
        db.rollback()
        destination.unlink(missing_ok=True)
        raise
    if old_photo and old_photo.startswith("/media/profile-photos/"):
        old_path = Path(settings.MEDIA_ROOT) / old_photo.removeprefix("/media/")
        old_path.unlink(missing_ok=True)
    return admin


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_admin_password(
    update: PasswordChange,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin),
):
    if not verify_password(update.current_password, admin.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if update.new_password != update.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match")
    password = update.new_password
    if not (
        any(character.islower() for character in password)
        and any(character.isupper() for character in password)
        and any(character.isdigit() for character in password)
    ):
        raise HTTPException(status_code=400, detail="New password must include an uppercase letter, a lowercase letter, and a number")
    admin.hashed_password = get_password_hash(password)
    admin.token_version += 1
    db.commit()


@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    admin=Depends(get_current_active_admin),
    search: Optional[str] = None,
    role: Optional[Literal["admin", "manager", "customer"]] = None,
    active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    query = db.query(User)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(or_(
            User.full_name.ilike(pattern),
            User.username.ilike(pattern),
            User.email.ilike(pattern),
        ))
    if role:
        query = query.filter(User.role == role)
    if active is not None:
        query = query.filter(User.is_active.is_(active))
    total = query.count()
    users = query.order_by(User.created_at.desc(), User.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": users,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/users/{user_id}", response_model=UserOut)
def get_user_details(
    user_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_active_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: AdminUserCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_active_admin),
):
    duplicate = db.query(User).filter(
        or_(func.lower(User.email) == user_in.email.lower(), func.lower(User.username) == user_in.username.lower())
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Email or username is already in use")
    user = User(
        email=user_in.email,
        username=user_in.username.strip(),
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_admin=user_in.role == "admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    update: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    values = update.model_dump(exclude_unset=True)
    if user.id == admin.id and values.get("is_active") is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    next_role = values.get("role", user.role)
    next_active = values.get("is_active", user.is_active)
    if user.role == "admin" and user.is_active and (next_role != "admin" or not next_active):
        active_admins = db.query(User).filter(User.role == "admin", User.is_active.is_(True)).count()
        if active_admins <= 1:
            raise HTTPException(status_code=409, detail="The last active administrator cannot be demoted or deactivated")
    for field in ("email", "username"):
        if field in values:
            values[field] = str(values[field]).strip()
    if "full_name" in values and values["full_name"] is not None:
        values["full_name"] = values["full_name"].strip()
    if "email" in values or "username" in values:
        duplicate = db.query(User).filter(
            User.id != user.id,
            or_(
                func.lower(User.email) == values.get("email", user.email).lower(),
                func.lower(User.username) == values.get("username", user.username).lower(),
            ),
        ).first()
        if duplicate:
            raise HTTPException(status_code=409, detail="Email or username is already in use")
    for field, value in values.items():
        if field == "role":
            user.role = value
            user.is_admin = value == "admin"
        else:
            setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/active", response_model=UserOut)
def set_user_active(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot change your own account status")
    if user.is_admin and user.is_active and not is_active:
        active_admins = db.query(User).filter(User.is_admin.is_(True), User.is_active.is_(True)).count()
        if active_admins <= 1:
            raise HTTPException(status_code=409, detail="The last active administrator cannot be deactivated")
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user
