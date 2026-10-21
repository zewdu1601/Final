# Customer Functions

## Customer-side page structure

1. **Home page** (`/`) — Shows store information, featured products, categories, and customer recommendations.
2. **Customer registration** (`/register`) — Creates an account with name, username, email, phone number, delivery address, and password.
3. **Customer login** (`/login`) — Authenticates with an email address or username and password.
4. **Browse and search products** (`/products`) — Searches and filters the catalog by text, category, stock availability, and sort order; product cards show image, price, and stock.
5. **AI product recommendations** (`/recommendations`) — Shows recommendations based on purchase history for signed-in customers and trending products for guests.
6. **Product details and shopping cart** (`/products/:id`, `/cart`) — Displays product details, stock, customer ratings and reviews; supports quantity selection and cart updates/removal.
7. **Checkout** (`/checkout`) — Confirms the order, contact details, delivery address, and total.
8. **Payment methods** (`/checkout`, payment step) — Select Cash on Delivery, Telebirr, CBE Birr/CBE payment, or Bank Card. This is a design preview only; no payment is processed and payment stays pending until confirmed separately.
9. **My orders and order tracking** (`/orders`, `/orders/:id`) — Shows order history, details, delivery status, payment status, and a tracking progression.
10. **Order notifications** (`/notifications`) — Shows new-order and order/payment status updates; unread notifications are marked read when opened.
11. **Product reviews and ratings** (`/reviews`) — Lets customers rate and review products they ordered; customers can update their own review.
12. **Customer profile** (`/profile`) — Updates name, username, email, phone, delivery address, and password.
13. **Chat with Store Management** (`/chat`) — Choose between separate, private conversations with a Store Manager or an Admin. Each agent sees only their own customer-support inbox; replies identify the sender's role.
14. **Logout** — Revokes the server session and ends the local customer session from the navigation menu.

## Customer functionality in use-case order

| No. | Function / use case | Purpose |
|---:|---|---|
| 1 | Register Account | Create a customer account |
| 2 | Login | Access customer features |
| 3 | View Products | Browse available products |
| 4 | Search and Filter Products | Find specific products |
| 5 | View Product Details | Check price, description, image, and stock |
| 6 | Receive AI Recommendations | Get personalized product suggestions |
| 7 | Manage Shopping Cart | Add, update, and remove products |
| 8 | Place Order | Submit a purchase |
| 9 | Make Payment | Pay using an available method |
| 10 | View Order History | Review previous purchases |
| 11 | Track Order | Check order status |
| 12 | Review and Rate Products | Submit feedback on ordered products |
| 13 | Manage Profile | Update personal details and password |
| 14 | Chat with Store Team | Ask for help with products, orders, or the account |
| 15 | Logout | End the session |

## Current payment and review behavior

- Payment method codes are `cash_on_delivery`, `telebirr`, `cbe`, and `card`. They are selectable preview options only; there is no connected payment gateway and selecting one never marks an order paid. Payment status remains independent (`Pending`, `Paid`, `Failed`, `Refunded`) from order status (`Pending`, `Confirmed`, `Processing`, `Shipped`, `Delivered`, `Cancelled`, `Returned`).
- Stock is checked and reserved when an order is placed. Cancelling an order before dispatch restores the reserved stock. Returned stock is not automatically restocked.
- A new order notifies active Store Managers and Admins. Customers receive notifications for order placement, order status changes, and payment status changes. Sales analytics count only orders that are both Delivered and Paid.
- Reviews can be submitted only for products in the signed-in customer's non-cancelled order history. A customer's next submission for the same product updates their existing review and the product's aggregate rating.
- Customer support messages are visible to that customer and the assigned agent role. Store Managers and Admins have separate customer-support inboxes and cannot read each other's support threads. Each message identifies whether it came from a Customer, Store Manager, or Admin. Admins and Store Managers also share a separate staff chat room; customers cannot access it.
