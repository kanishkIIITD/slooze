import { Router } from "express";
import { AuthRequest, generateToken, authMiddleware } from "./auth";
import { filterByCountry, menuItems, orders, paymentMethods, restaurants, users } from "./data";
import { requirePermission } from "./rbac";
import { MenuItem, Order, OrderItem } from "./models";

const router = Router();

// ---------- Auth ----------

router.post("/auth/login", (req, res) => {
  const { userId } = req.body as { userId: string };
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(400).json({ message: "Invalid userId" });
  }
  const token = generateToken(user);
  return res.json({ token, user });
});

// All routes below require authentication
router.use(authMiddleware);

router.get("/me", (req: AuthRequest, res) => {
  return res.json(req.user);
});

// ---------- Restaurants & Menu (country-scoped) ----------

router.get("/restaurants", requirePermission("canViewRestaurants"), (req: AuthRequest, res) => {
  const user = req.user!;
  const visibleRestaurants = filterByCountry(restaurants, user);
  res.json(visibleRestaurants);
});

router.get(
  "/restaurants/:id/menu",
  requirePermission("canViewRestaurants"),
  (req: AuthRequest, res) => {
    const user = req.user!;
    const restaurant = restaurants.find((r) => r.id === req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    // Country restriction for non-admins
    if (user.role !== "ADMIN" && restaurant.country !== user.country) {
      return res.status(403).json({ message: "Forbidden: cross-country access denied" });
    }
    const items = menuItems.filter((m) => m.restaurantId === restaurant.id);
    res.json({ restaurant, items });
  }
);

// ---------- Orders & Cart ----------

router.post(
  "/orders",
  requirePermission("canCreateOrder"),
  (req: AuthRequest, res): void => {
    const user = req.user!;
    const { restaurantId, items } = req.body as {
      restaurantId: string;
      items: OrderItem[];
    };

    const restaurant = restaurants.find((r) => r.id === restaurantId);
    if (!restaurant) {
      res.status(400).json({ message: "Invalid restaurantId" });
      return;
    }

    if (user.role !== "ADMIN" && restaurant.country !== user.country) {
      res.status(403).json({ message: "Forbidden: cross-country access denied" });
      return;
    }

    const orderItems: OrderItem[] = [];
    let totalAmount = 0;

    for (const item of items) {
      const menuItem = menuItems.find(
        (m: MenuItem) => m.id === item.menuItemId && m.restaurantId === restaurantId
      );
      if (!menuItem) {
        res.status(400).json({ message: `Invalid menuItemId: ${item.menuItemId}` });
        return;
      }
      const quantity = item.quantity > 0 ? item.quantity : 1;
      orderItems.push({ menuItemId: menuItem.id, quantity });
      totalAmount += menuItem.price * quantity;
    }

    const order: Order = {
      id: `o${orders.length + 1}`,
      userId: user.id,
      country: user.role === "ADMIN" ? restaurant.country : user.country,
      restaurantId,
      items: orderItems,
      status: "DRAFT",
      totalAmount,
      paymentMethodId: null
    };

    orders.push(order);
    res.status(201).json(order);
  }
);

router.get("/orders", (req: AuthRequest, res) => {
  const user = req.user!;
  let visibleOrders = orders;
  if (user.role !== "ADMIN") {
    visibleOrders = orders.filter((o) => o.country === user.country);
  }
  res.json(visibleOrders);
});

router.get("/orders/:id", (req: AuthRequest, res) => {
  const user = req.user!;
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  if (user.role !== "ADMIN" && order.country !== user.country) {
    return res.status(403).json({ message: "Forbidden: cross-country access denied" });
  }
  res.json(order);
});

router.post(
  "/orders/:id/checkout",
  requirePermission("canPlaceOrder"),
  (req: AuthRequest, res) => {
    const user = req.user!;
    const { paymentMethodId } = req.body as { paymentMethodId: string };

    const order = orders.find((o) => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (user.role !== "ADMIN" && order.country !== user.country) {
      return res.status(403).json({ message: "Forbidden: cross-country access denied" });
    }
    if (order.status !== "DRAFT") {
      return res.status(400).json({ message: "Only DRAFT orders can be placed" });
    }

    const pm = paymentMethods.find((p) => p.id === paymentMethodId);
    if (!pm) {
      return res.status(400).json({ message: "Invalid paymentMethodId" });
    }

    order.status = "PLACED";
    order.paymentMethodId = paymentMethodId;
    return res.json(order);
  }
);

router.post(
  "/orders/:id/cancel",
  requirePermission("canCancelOrder"),
  (req: AuthRequest, res) => {
    const user = req.user!;
    const order = orders.find((o) => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (user.role !== "ADMIN" && order.country !== user.country) {
      return res.status(403).json({ message: "Forbidden: cross-country access denied" });
    }
    if (order.status !== "PLACED") {
      return res.status(400).json({ message: "Only PLACED orders can be cancelled" });
    }
    order.status = "CANCELLED";
    return res.json(order);
  }
);

// ---------- Payment Methods (Admin only) ----------

router.get("/payment-methods", (req: AuthRequest, res) => {
  // Everyone can view which payment methods are available
  return res.json(paymentMethods);
});

router.put(
  "/payment-methods",
  requirePermission("canUpdatePaymentMethod"),
  (req: AuthRequest, res) => {
    const { methods } = req.body as { methods: typeof paymentMethods };
    if (!Array.isArray(methods)) {
      return res.status(400).json({ message: "methods must be an array" });
    }
    // Replace all methods (for demo simplicity)
    paymentMethods.splice(0, paymentMethods.length, ...methods);
    return res.json(paymentMethods);
  }
);

export default router;

