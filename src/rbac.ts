import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { rolePermissions } from "./data";

type PermissionKey =
  | "canViewRestaurants"
  | "canCreateOrder"
  | "canPlaceOrder"
  | "canCancelOrder"
  | "canUpdatePaymentMethod";

export function requirePermission(permission: PermissionKey) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthenticated" });
    }
    const perms = rolePermissions[user.role];
    if (!perms[permission]) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    next();
  };
}
