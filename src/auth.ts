import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { User } from "./models";
import { users } from "./data";

const JWT_SECRET = "very-secret-key"; // For assignment/demo only

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      role: user.role,
      country: user.country
    },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.substring("Bearer ".length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      name: string;
      role: string;
      country: string;
    };
    const user = users.find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
