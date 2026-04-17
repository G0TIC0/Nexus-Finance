import express, { Request, Response, NextFunction } from "express";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import path from "path";
import { PrismaClient, Transaction } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import crypto from "crypto";

// --- Block 1.1: JWT Secret Validation ---
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set. Refusing to start.");
  process.exit(1);
}

// --- Block 2.1: PrismaClient Initialization ---
/**
 * Initialize PrismaClient ensuring the SQLite URL has the correct protocol.
 * Logs queries only in development mode.
 */
const getPrisma = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });
};

const prisma = getPrisma();

// --- Block 3.4: Explicit Interfaces ---
interface AuthRequest extends Request {
  userId: string;
}

// --- Block 1.2: Security Cookie Helper ---
/**
 * Define o cookie JWT com todas as flags de segurança corretas.
 * - httpOnly: impede acesso via document.cookie (XSS)
 * - secure: só envia por HTTPS em produção
 * - sameSite: 'strict' previne CSRF
 */
function setAuthCookie(res: Response, token: string) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  });
}

// --- Block 1.6: Password Reset Helpers ---
/**
 * Gera um token criptograficamente seguro e retorna
 * o token raw (para enviar por e-mail) e o hash (para armazenar).
 */
function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for express-rate-limit to work correctly behind Google's proxy
  app.set("trust proxy", 1);

  app.use(express.json());
  app.use(cookieParser());

  // --- Block 1.5: Rate Limiting ---
  const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5,                    // máximo 5 tentativas por IP
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }, // Express is already trusting the proxy
    message: {
      error: "Muitas tentativas de login. Aguarde 15 minutos e tente novamente.",
    },
    skipSuccessfulRequests: true,
  });

  // --- Auth Middleware ---
  /**
   * Middleware to authenticate users via JWT cookie.
   * Uses explicit types and handles errors gracefully.
   */
  const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = (req as any).cookies?.token;
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET as string) as unknown as { userId: string };
      (req as AuthRequest).userId = decoded.userId;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- Auth Routes ---
  const registerSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  });

  const loginSchema = z.object({
    email: z.string().email("E-mail inválido"),
    password: z.string().min(1, "Senha obrigatória"),
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues[0].message });
      }
      const { name, email, password } = result.data;
      
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: "Email already in use" });

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { name, email, hashedPassword },
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET as string, { expiresIn: "7d" });
      setAuthCookie(res, token);
      
      res.json({ user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      res.status(400).json({ error: message });
    }
  });

  app.post("/api/auth/login", loginRateLimiter, async (req: Request, res: Response) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues[0].message });
      }
      const { email, password } = result.data;

      const user = await prisma.user.findUnique({ where: { email } });
      
      if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
        return res.status(401).json({ error: "E-mail ou senha incorretos. Verifique os dados e tente novamente." });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET as string, { expiresIn: "7d" });
      setAuthCookie(res, token);
      
      res.json({ user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      res.status(400).json({ error: message });
    }
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: (req as AuthRequest).userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  });

  app.patch("/api/auth/profile", authenticate, async (req: Request, res: Response) => {
    try {
      const { name, avatarUrl } = req.body;
      const userId = (req as AuthRequest).userId;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          name: name || undefined,
          avatarUrl: avatarUrl || undefined,
        },
      });

      res.json({ user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      res.status(400).json({ error: message });
    }
  });

  // --- Block 2.3: Forgot Password Endpoint ---
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email || !z.string().email().safeParse(email).success) {
      return res.status(400).json({ error: "E-mail inválido" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const { tokenHash } = generateResetToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hora de validade

      await prisma.passwordResetToken.create({
        data: {
          tokenHash,
          email,
          expiresAt,
        },
      });
      // In a real app, send email here with rawToken
    }

    // Always return generic success to avoid user enumeration
    res.json({ success: true, message: "Se este e-mail existir, você receberá as instruções em breve." });
  });

  // --- Transaction Routes ---
  const createTransactionSchema = z.object({
    description: z.string().min(1).max(255),
    amount: z.number().positive("Valor deve ser positivo"),
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
    status: z.enum(["REALIZED", "PROJECTED"]).default("REALIZED"),
    competenceDate: z.string().datetime({ message: "Data de competência inválida" }),
    paymentDate: z.string().datetime().optional(),
    categoryId: z.string().cuid().optional(),
  });

  app.get("/api/transactions", authenticate, async (req: Request, res: Response) => {
    const transactions = await prisma.transaction.findMany({
      where: { userId: (req as AuthRequest).userId },
      orderBy: { competenceDate: "desc" },
      include: { category: true },
    });
    res.json(transactions);
  });

  app.post("/api/transactions", authenticate, async (req: Request, res: Response) => {
    try {
      const result = createTransactionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error.issues[0].message });
      }
      const { description, amount, type, status, competenceDate, categoryId } = result.data;

      const transaction = await prisma.transaction.create({
        data: {
          description,
          amount,
          type,
          status,
          competenceDate: new Date(competenceDate),
          categoryId,
          userId: (req as AuthRequest).userId,
        },
      });
      res.json({ success: true, data: transaction });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create transaction";
      res.status(500).json({ success: false, error: message });
    }
  });

  // --- Block 2.6: Fixed Expense Engine ---
  app.post("/api/engine/process-fixed-expenses", authenticate, async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).userId;
    
    try {
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

      const fixedExpenses = await prisma.fixedExpense.findMany({
        where: { 
          userId, 
          autoProvision: true, 
          active: true, // Block 2.6: Filter active only
          nextDueDate: { lte: ninetyDaysFromNow } 
        },
      });

      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const expense of fixedExpenses) {
        try {
          // Block 2.6: Check if transaction already exists by fixedExpenseId
          const existing = await prisma.transaction.findFirst({
            where: {
              userId,
              fixedExpenseId: expense.id,
              competenceDate: expense.nextDueDate,
              status: "PROJECTED",
            },
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Create projected transaction
          await prisma.transaction.create({
            data: {
              description: expense.description,
              amount: expense.amount,
              type: "EXPENSE",
              status: "PROJECTED",
              competenceDate: expense.nextDueDate,
              userId,
              fixedExpenseId: expense.id, // Track origin
            },
          });

          // Update next due date
          let nextDate = new Date(expense.nextDueDate);
          if (expense.recurrence === "DAILY") nextDate.setDate(nextDate.getDate() + 1);
          else if (expense.recurrence === "WEEKLY") nextDate.setDate(nextDate.getDate() + 7);
          else if (expense.recurrence === "MONTHLY") nextDate.setMonth(nextDate.getMonth() + 1);
          else if (expense.recurrence === "ANNUAL") nextDate.setFullYear(nextDate.getFullYear() + 1);

          await prisma.fixedExpense.update({
            where: { id: expense.id },
            data: { nextDueDate: nextDate },
          });

          created++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          errors.push(`Error processing ${expense.description}: ${message}`);
        }
      }

      res.json({ success: true, data: { created, skipped, errors } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Engine failed";
      res.status(500).json({ success: false, error: message });
    }
  });

  // --- Block 2.7: Variance Calculation ---
  /**
   * Calcula a confiança da previsão baseada no coeficiente de variação (CV)
   * das despesas dos últimos 3 meses.
   * CV < 15% → HIGH | 15-30% → MEDIUM | > 30% → LOW
   */
  function calculateConfidence(expenses: number[]): "LOW" | "MEDIUM" | "HIGH" {
    if (expenses.length < 2) return "LOW";
    const mean = expenses.reduce((a, b) => a + b, 0) / expenses.length;
    if (mean === 0) return "LOW";
    const variance = expenses.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / expenses.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100;
    if (cv < 15) return "HIGH";
    if (cv < 30) return "MEDIUM";
    return "LOW";
  }

  // --- Block 2.4 & 2.5: Forecasting Engine ---
  app.post("/api/engine/generate-forecast", authenticate, async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).userId;
    const MONTHLY_INFLATION_RATE = 0.005;

    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          status: "REALIZED",
          competenceDate: { gte: sixMonthsAgo },
        },
      });

      const monthlyData: Record<string, { income: number; expense: number }> = {};
      transactions.forEach((t: Transaction) => {
        // Block 2.4: Explicit Date cast
        const date = new Date(t.competenceDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
        if (t.type === "INCOME") monthlyData[monthKey].income += Number(t.amount);
        else if (t.type === "EXPENSE") monthlyData[monthKey].expense += Number(t.amount);
      });

      const sortedMonths = Object.keys(monthlyData).sort();
      const last3Months = sortedMonths.slice(-3);

      let avgIncome = 0;
      let avgExpense = 0;
      last3Months.forEach((m) => {
        avgIncome += monthlyData[m].income;
        avgExpense += monthlyData[m].expense;
      });
      avgIncome /= Math.max(last3Months.length, 1);
      avgExpense /= Math.max(last3Months.length, 1);

      // Block 2.5: Optimized Balance Calculation
      const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId, status: "REALIZED", type: "INCOME" },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId, status: "REALIZED", type: "EXPENSE" },
          _sum: { amount: true },
        }),
      ]);

      let currentBalance = Number(incomeAgg._sum?.amount ?? 0) - Number(expenseAgg._sum?.amount ?? 0);

      const projectedBalances = [];
      for (let i = 1; i <= 3; i++) {
        const inflationFactor = Math.pow(1 + MONTHLY_INFLATION_RATE, i);
        const projectedIncome = avgIncome;
        const projectedExpense = avgExpense * inflationFactor;
        
        currentBalance = currentBalance + projectedIncome - projectedExpense;
        projectedBalances.push(currentBalance);
      }

      const last3Expenses = last3Months.map((m) => monthlyData[m].expense);
      const confidence = calculateConfidence(last3Expenses);

      const forecast = await prisma.forecast.create({
        data: {
          userId,
          monthsAhead: 3,
          projectedBalance: JSON.stringify(projectedBalances),
          confidence,
        },
      });

      res.json({
        success: true,
        data: {
          forecastId: forecast.id,
          projectedBalances,
          confidence: forecast.confidence as "LOW" | "MEDIUM" | "HIGH",
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Forecast failed";
      res.status(500).json({ success: false, error: message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

