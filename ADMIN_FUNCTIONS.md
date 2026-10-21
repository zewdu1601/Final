# Admin Functions

## Main functions

1. **Admin login** — Administrators sign in with their account. Admin routes are restricted to authenticated users with the administrator role.
2. **Manage users** — Administrators can review registered users and enable or deactivate customer accounts. Adding users and editing user details are not currently available in the admin interface.
3. **Manage system settings** — Application-wide settings are currently supplied through server configuration. An admin settings editor has not been implemented.
4. **Monitor AI recommendations** — The Admin Functions page lets an administrator select a catalog product and preview similar-product recommendations returned by the recommendation API.
5. **View reports** — The Analytics page presents paid revenue, average order value, order totals, monthly sales, and top-selling products.

## Admin flow

1. Open the store and log in with an administrator account.
2. Open the protected administration dashboard.
3. Choose an admin function:
   - Manage user accounts.
   - Review recommendation results for a selected product.
   - Open store analytics and reports.
   - Review system configuration, which is currently managed outside the admin interface.
4. Log out when administration is complete.

## Collaboration with the rest of the system

- **Customers** browse products, receive recommendations, and place orders.
- **Store managers** manage products, categories, inventory, and orders through the store-management pages.
- **The recommendation service** uses catalog information and customer purchase history to generate recommendations. The admin preview uses the similar-products endpoint to inspect results for a selected product.
- **The database** stores users, catalog data, and orders; the admin dashboard and reports read this information through the API.

The current admin user interface is an overview and navigation point for the implemented functions. User creation/profile editing and an in-app system-settings editor remain future work.
