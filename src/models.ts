export type Role = "ADMIN" | "MANAGER" | "MEMBER";

export type Country = "INDIA" | "AMERICA";

export interface User {
  id: string;
  name: string;
  role: Role;
  country: Country;
}

export interface Restaurant {
  id: string;
  name: string;
  country: Country;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
}

export type OrderStatus = "DRAFT" | "PLACED" | "CANCELLED";

export interface OrderItem {
  menuItemId: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  country: Country;
  restaurantId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  paymentMethodId: string | null;
}

export interface PaymentMethod {
  id: string;
  type: "CARD" | "UPI" | "WALLET";
  details: string;
}
