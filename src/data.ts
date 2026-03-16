import { Country, MenuItem, Order, PaymentMethod, Restaurant, Role, User } from "./models";

// Mock users based on the assignment
export const users: User[] = [
  { id: "1", name: "Nick Fury", role: "ADMIN", country: "INDIA" }, // Admin is org-wide, country not enforced
  { id: "2", name: "Captain Marvel", role: "MANAGER", country: "INDIA" },
  { id: "3", name: "Captain America", role: "MANAGER", country: "AMERICA" },
  { id: "4", name: "Thanos", role: "MEMBER", country: "INDIA" },
  { id: "5", name: "Thor", role: "MEMBER", country: "INDIA" },
  { id: "6", name: "Travis", role: "MEMBER", country: "AMERICA" }
];

export const restaurants: Restaurant[] = [
  { id: "r1", name: "Mumbai Masala", country: "INDIA" },
  { id: "r2", name: "Delhi Diner", country: "INDIA" },
  { id: "r3", name: "New York Bites", country: "AMERICA" },
  { id: "r4", name: "California Grill", country: "AMERICA" }
];

export const menuItems: MenuItem[] = [
  { id: "m1", restaurantId: "r1", name: "Paneer Tikka", price: 250 },
  { id: "m2", restaurantId: "r1", name: "Butter Naan", price: 60 },
  { id: "m3", restaurantId: "r3", name: "Cheeseburger", price: 8 },
  { id: "m4", restaurantId: "r3", name: "Fries", price: 3 },
  { id: "m5", restaurantId: "r2", name: "Chole Bhature", price: 180 },
  { id: "m6", restaurantId: "r4", name: "BBQ Ribs", price: 15 }
];

// Simple org-wide payment methods. Only Admin can modify.
export let paymentMethods: PaymentMethod[] = [
  { id: "pm1", type: "CARD", details: "VISA **** 4242" },
  { id: "pm2", type: "UPI", details: "nick@upi" }
];

// In-memory orders storage
export const orders: Order[] = [];

// Helper to get role permissions
export const rolePermissions: Record<
  Role,
  {
    canViewRestaurants: boolean;
    canCreateOrder: boolean;
    canPlaceOrder: boolean;
    canCancelOrder: boolean;
    canUpdatePaymentMethod: boolean;
  }
> = {
  ADMIN: {
    canViewRestaurants: true,
    canCreateOrder: true,
    canPlaceOrder: true,
    canCancelOrder: true,
    canUpdatePaymentMethod: true
  },
  MANAGER: {
    canViewRestaurants: true,
    canCreateOrder: true,
    canPlaceOrder: true,
    canCancelOrder: true,
    canUpdatePaymentMethod: false
  },
  MEMBER: {
    canViewRestaurants: true,
    canCreateOrder: true,
    canPlaceOrder: false,
    canCancelOrder: false,
    canUpdatePaymentMethod: false
  }
};

export function filterByCountry<T extends { country: Country }>(items: T[], user: User): T[] {
  if (user.role === "ADMIN") {
    return items;
  }
  return items.filter((i) => i.country === user.country);
}
