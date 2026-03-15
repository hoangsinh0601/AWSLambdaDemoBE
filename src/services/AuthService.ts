import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { UserRepository } from "../repositories/UserRepository";
import type { AuthTokenPayload, LoginUserRequest, PublicUser, RegisterUserRequest, User } from "../models/User";
import { ConflictError, UnauthorizedError, ValidationError } from "../utils/errors";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret";
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);
const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || "admin@demo.local").trim().toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123456";
const DEFAULT_ADMIN_NAME = (process.env.DEFAULT_ADMIN_NAME || "Default Admin").trim();

export class AuthService {
  constructor(private readonly userRepository = new UserRepository()) {}

  async register(input: RegisterUserRequest): Promise<{ token: string; user: PublicUser }> {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    if (!email) throw new ValidationError("email is required");
    if (!name) throw new ValidationError("name is required");
    if (!input.password || input.password.length < 6) throw new ValidationError("password must be at least 6 characters");

    const existing = await this.userRepository.getByEmail(email);
    if (existing) {
      throw new ConflictError("Email is already registered");
    }

    const now = new Date().toISOString();
    const user: User = {
      userId: uuidv4(),
      email,
      name,
      role: ADMIN_EMAILS.has(email) ? "ADMIN" : "USER",
      passwordHash: await bcrypt.hash(input.password, 10),
      createdAt: now,
      updatedAt: now,
    };

    await this.userRepository.create(user);

    return {
      token: this.signToken(user),
      user: this.toPublicUser(user),
    };
  }

  async login(input: LoginUserRequest): Promise<{ token: string; user: PublicUser }> {
    const email = input.email.trim().toLowerCase();
    await this.ensureDefaultAdminExists(email);
    const user = await this.userRepository.getByEmail(email);

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid email or password");
    }

    return {
      token: this.signToken(user),
      user: this.toPublicUser(user),
    };
  }

  async getUserById(userId: string): Promise<PublicUser> {
    const user = await this.userRepository.getById(userId);
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    return this.toPublicUser(user);
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
  }

  private async ensureDefaultAdminExists(email: string): Promise<void> {
    if (email !== DEFAULT_ADMIN_EMAIL) {
      return;
    }

    const existing = await this.userRepository.getByEmail(DEFAULT_ADMIN_EMAIL);
    if (existing) {
      return;
    }

    const now = new Date().toISOString();
    const user: User = {
      userId: uuidv4(),
      email: DEFAULT_ADMIN_EMAIL,
      name: DEFAULT_ADMIN_NAME,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10),
      createdAt: now,
      updatedAt: now,
    };

    await this.userRepository.create(user);
  }

  private signToken(user: User): string {
    return jwt.sign(
      {
        sub: user.userId,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );
  }

  private toPublicUser(user: User): PublicUser {
    return {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
