import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
dotenv.config({ override: true });
// import { createServer as createViteServer } from "vite";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import cors from "cors";
import multer from "multer";

// Configuração do multer para upload de arquivos (Avatar)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

// --- Block 1.1: JWT Secret Validation ---
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET não definido. Encerrando.");
  process.exit(1);
}
if (JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET muito curto. Use no mínimo 32 caracteres (recomendado: 64+).");
  process.exit(1);
}

// --- Block 2.1: PrismaClient Initialization ---
// Forçamos o carregamento do .env para garantir que as URLs corretas sejam usadas
const envConfig = dotenv.config({ override: true });
if (envConfig.error) {
  console.warn("[Config] Aviso: Não foi possível carregar o arquivo .env", envConfig.error);
}

const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`[Database] Usando string de conexão: ${maskedUrl}`);
} else {
  console.error("[Database] ERRO: DATABASE_URL não definida!");
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl }
  },
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
});

// --- Block 3.4: Explicit Interfaces ---
interface AuthRequest extends Request {
  userId: string;
}

// --- Block 1.2: Security Cookie Helper ---
function setAuthCookie(res: Response, token: string) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  });
}

// --- Block 1.6: Password Reset Helpers ---
function generateResetToken() {
  const rawToken = crypto.randomBytes(64).toString("hex"); // 128 chars
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

export async function createApp() {
  const app = express();

  // Trust proxy for express-rate-limit
  app.set("trust proxy", 1);

  app.use(express.json());
  app.use(cookieParser());

  // --- Block 1.6: CORS Configuration ---
  app.use(cors({
    origin: (origin, callback) => {
      // Em desenvolvimento, permitimos qualquer origem para facilitar o preview no AI Studio
      if (!origin || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        const allowed = process.env.ALLOWED_ORIGIN || "https://seudominio.com";
        if (origin === allowed) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      }
    },
    credentials: true,
  }));

  // --- Block 1.5: Rate Limiting ---
  const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5,
    message: { error: "Muitas tentativas de login. Aguarde 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  });

  const registerRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10,
    message: { error: "Muitas tentativas de cadastro. Aguarde 1 hora." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const forgotPasswordRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5,
    message: { error: "Muitas solicitações. Aguarde 1 hora." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const engineRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 3,
    message: { error: "Aguarde um momento antes de executar novamente." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // --- Auth Middleware ---
  const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Sempre garante a existência de um usuário padrão para o modo aberto
      let defaultUser;
      try {
        defaultUser = await prisma.user.findFirst({
          where: { email: "usuario@exemplo.com" }
        });
      } catch (dbErr) {
        console.error("Database connection error during authentication:", dbErr);
        res.status(503).json({ 
          error: "Serviço de banco de dados indisponível no momento",
          details: dbErr instanceof Error ? dbErr.message : String(dbErr)
        });
        return;
      }

      if (!defaultUser) {
        try {
          // Use upsert to safely handle concurrent creation requests
          defaultUser = await prisma.user.upsert({
            where: { email: "usuario@exemplo.com" },
            update: {},
            create: {
              name: "Usuário Nexus",
              email: "usuario@exemplo.com",
              hashedPassword: await bcrypt.hash("nexus123", 12),
              preferences: { theme: "light" }
            }
          });
        } catch (createErr) {
          // If upsert fails for some reason or we hit a race condition, try fetching one last time
          defaultUser = await prisma.user.findFirst({
            where: { email: "usuario@exemplo.com" }
          });

          if (!defaultUser) {
            console.error("Error ensuring default user:", createErr);
            res.status(503).json({ 
              error: "Erro ao inicializar perfil de acesso automático",
              details: createErr instanceof Error ? createErr.message : String(createErr)
            });
            return;
          }
        }
      }

      (req as AuthRequest).userId = defaultUser.id;
      next();
    } catch (err) {
      console.error("Error ensuring default user:", err);
      res.status(500).json({ error: "Erro ao inicializar sessão automática" });
    }
  };

  // --- Health Check ---
  app.get("/api/health", (_req, res) => res.json({ status: "ok", env: process.env.NODE_ENV || "development" }));

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

  app.post("/api/auth/register", registerRateLimiter, async (req: Request, res: Response) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        console.warn("Registration validation failed:", result.error.format());
        return res.status(400).json({ error: result.error.issues[0].message });
      }
      
      const { name, email, password } = result.data;
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: "E-mail já está em uso" });

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { name, email, hashedPassword, preferences: {} },
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET as string, { expiresIn: "7d" });
      setAuthCookie(res, token);
      
      res.json({ user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
    } catch (err: any) {
      console.error("Registration error details:", err);
      res.status(400).json({ error: `Falha ao registrar: ${err.message || 'Erro de banco de dados'}` });
    }
  });

  app.post("/api/auth/login", loginRateLimiter, async (req: Request, res: Response) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        console.warn("Login validation failed:", result.error.format());
        return res.status(400).json({ error: result.error.issues[0].message });
      }
      
      const { email, password } = result.data;
      const user = await prisma.user.findUnique({ where: { email } });
      
      if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
        return res.status(401).json({ error: "E-mail ou senha incorretos." });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET as string, { expiresIn: "7d" });
      setAuthCookie(res, token);
      
      res.json({ user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
    } catch (err: any) {
      console.error("Login error details:", err);
      res.status(400).json({ error: `Erro no login: ${err.message || 'Erro de banco de dados'}` });
    }
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: (req as AuthRequest).userId } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, preferences: user.preferences } });
  });

  // --- Block 1.3: Secure Profile Update ---
  const updateProfileSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    avatarUrl: z.string().url("URL de avatar inválida").refine(url => url.startsWith("https://"), "avatarUrl deve usar HTTPS").optional(),
  });

  app.patch("/api/auth/profile", authenticate, async (req: Request, res: Response) => {
    try {
      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error.issues[0].message });
      
      const { name, avatarUrl } = result.data;
      const user = await prisma.user.update({
        where: { id: (req as AuthRequest).userId },
        data: { ...(name && { name }), ...(avatarUrl && { avatarUrl }) },
      });

      res.json({ 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          avatarUrl: user.avatarUrl,
          preferences: user.preferences
        } 
      });
    } catch (err: unknown) {
      res.status(400).json({ error: "Falha ao atualizar perfil" });
    }
  });

  // --- Block 4.2: Update Preferences ---
  const preferencesSchema = z.object({
    notifications: z.object({
      gastos: z.boolean().optional(),
      relatorio: z.boolean().optional(),
      ia: z.boolean().optional(),
    }).optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
  }).strict();

  app.patch("/api/auth/preferences", authenticate, async (req: Request, res: Response) => {
    try {
      const result = preferencesSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error.issues[0].message });
      
      const userId = (req as AuthRequest).userId;
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      
      if (!currentUser) return res.status(404).json({ error: "Usuário não encontrado" });

      const currentPrefs = (currentUser.preferences as any) || {};
      const newPrefs = { ...currentPrefs, ...result.data };

      const user = await prisma.user.update({
        where: { id: userId },
        data: { preferences: newPrefs },
      });
      res.json({ preferences: user.preferences });
    } catch (err: unknown) {
      res.status(400).json({ error: "Falha ao atualizar preferências" });
    }
  });

  // --- Block 2.5: Change Password ---
  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  });

  app.post("/api/auth/change-password", authenticate, async (req: Request, res: Response) => {
    try {
      const result = changePasswordSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error.issues[0].message });
      
      const { currentPassword, newPassword } = result.data;
      const user = await prisma.user.findUnique({ where: { id: (req as AuthRequest).userId } });
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
      
      const valid = await bcrypt.compare(currentPassword, user.hashedPassword);
      if (!valid) return res.status(401).json({ error: "Senha atual incorreta." });
      
      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: user.id }, data: { hashedPassword: hashed } });
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ error: "Erro ao alterar senha." });
    }
  });

  // --- Block 2.4: Password Recovery ---
  app.post("/api/auth/forgot-password", forgotPasswordRateLimiter, async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email || !z.string().email().safeParse(email).success) return res.status(400).json({ error: "E-mail inválido" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const { rawToken, tokenHash } = generateResetToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await prisma.passwordResetToken.create({ data: { tokenHash, email, expiresAt } });
      // EM DEV: Mostrar token para facilitar o teste conforme pedido no bloco 2.4
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] Token de reset para ${email}: ${rawToken}`);
      }
    }
    res.json({ success: true, message: "Se este e-mail existir, você receberá as instruções em breve." });
  });

  const resetPasswordSchema = z.object({
    token: z.string().min(128, "Token inválido"),
    newPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const result = resetPasswordSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error.issues[0].message });
      
      const { token, newPassword } = result.data;
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { tokenHash, expiresAt: { gt: new Date() }, usedAt: null },
      });

      if (!resetToken) return res.status(400).json({ error: "Token inválido ou expirado." });

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { email: resetToken.email }, data: { hashedPassword } });
      await prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } });

      res.json({ success: true, message: "Senha redefinida com sucesso." });
    } catch (err: unknown) {
      res.status(500).json({ error: "Erro ao redefinir senha." });
    }
  });

  // --- Block 5.1: Paginated Transactions ---
  const createTransactionSchema = z.object({
    description: z.string().min(1, "Descrição é obrigatória").max(255),
    amount: z.number().positive("Valor deve ser positivo"),
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
    status: z.enum(["REALIZED", "PROJECTED"]).default("REALIZED"),
    competenceDate: z.string(), // Relaxed to allow various date formats, parsed manually
    categoryId: z.string().cuid().optional().or(z.literal("")).transform(v => v === "" ? undefined : v),
  });

  app.get("/api/transactions", authenticate, async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where: { userId: (req as AuthRequest).userId },
          orderBy: { competenceDate: "desc" },
          include: { category: true },
          skip,
          take: limit,
        }),
        prisma.transaction.count({ where: { userId: (req as AuthRequest).userId } }),
      ]);

      res.json({ data: transactions, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
      console.error("Error fetching transactions:", err);
      res.status(500).json({ error: "Erro ao buscar transações" });
    }
  });

  app.post("/api/transactions", authenticate, async (req: Request, res: Response) => {
    try {
      const result = createTransactionSchema.safeParse(req.body);
      if (!result.success) {
        console.warn("Transaction validation failed:", result.error.format());
        return res.status(400).json({ error: result.error.issues[0].message });
      }
      
      const compDate = new Date(result.data.competenceDate);
      if (isNaN(compDate.getTime())) {
        return res.status(400).json({ error: "Data de competência inválida" });
      }
      
      const transaction = await prisma.transaction.create({
        data: { 
          ...result.data, 
          competenceDate: compDate, 
          userId: (req as AuthRequest).userId 
        },
      });
      res.json({ success: true, data: transaction });
    } catch (err: any) {
      console.error("Error creating transaction:", err);
      res.status(500).json({ 
        error: "Falha ao criar transação", 
        details: process.env.NODE_ENV === "development" ? err.message : undefined 
      });
    }
  });

  // --- Block 5.3: Categories & Fixed Expenses CRUD ---
  app.get("/api/categories", authenticate, async (req: Request, res: Response) => {
    const categories = await prisma.category.findMany({ 
      where: { userId: (req as AuthRequest).userId },
      orderBy: { name: "asc" } 
    });
    res.json(categories);
  });

  app.post("/api/categories", authenticate, async (req: Request, res: Response) => {
    try {
      const schema = z.object({ 
        name: z.string().min(1).max(50), 
        color: z.string().min(4).max(9), 
        icon: z.string().optional() 
      });
      const result = schema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error.issues[0].message });
      const cat = await prisma.category.create({ 
        data: { ...result.data, userId: (req as AuthRequest).userId } 
      });
      res.json(cat);
    } catch (err: unknown) {
      res.status(500).json({ error: "Erro ao criar categoria" });
    }
  });

  app.get("/api/fixed-expenses", authenticate, async (req: Request, res: Response) => {
    const expenses = await prisma.fixedExpense.findMany({
      where: { userId: (req as AuthRequest).userId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(expenses);
  });

  const fixedExpenseSchema = z.object({
    description: z.string().min(1, "Descrição é obrigatória").max(255),
    amount: z.number().positive("Valor deve ser positivo"),
    recurrence: z.enum(["DAILY", "WEEKLY", "MONTHLY", "ANNUAL"]),
    nextDueDate: z.string(), // Relaxed to allow various date strings, will parse to Date
    autoProvision: z.boolean().default(true),
    categoryId: z.string().cuid().optional().or(z.literal("")).transform(v => v === "" ? undefined : v),
  });

  app.post("/api/fixed-expenses", authenticate, async (req: Request, res: Response) => {
    try {
      const result = fixedExpenseSchema.safeParse(req.body);
      if (!result.success) {
        console.warn("Fixed expense validation failed:", result.error.format());
        return res.status(400).json({ error: result.error.issues[0].message });
      }
      const dueDate = new Date(result.data.nextDueDate);
      if (isNaN(dueDate.getTime())) {
        return res.status(400).json({ error: "Data de vencimento inválida" });
      }

      const expense = await prisma.fixedExpense.create({
        data: { 
          ...result.data, 
          userId: (req as AuthRequest).userId, 
          nextDueDate: dueDate 
        },
      });
      res.json(expense);
    } catch (err: any) {
      console.error("Error creating fixed expense:", err);
      res.status(500).json({ 
        error: "Erro ao criar despesa fixa",
        details: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }
  });

  app.patch("/api/fixed-expenses/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).userId;
      const expense = await prisma.fixedExpense.findFirst({
        where: { id: req.params.id, userId }
      });
      if (!expense) return res.status(404).json({ error: "Despesa fixa não encontrada" });

      // If body has 'active' but nothing else from the schema, we can do a partial update
      // Otherwise we validate against the schema (ignoring required if they aren't there? 
      // Actually let's just make it a full update or partial based on what's provided)
      
      const partialSchema = fixedExpenseSchema.partial();
      const result = partialSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues[0].message });
      }

      const updateData: any = { ...result.data };
      if (updateData.nextDueDate) {
        updateData.nextDueDate = new Date(updateData.nextDueDate);
      }
      
      // Specifically handle 'active' if provided separately or via parse
      if (req.body.active !== undefined) {
        updateData.active = Boolean(req.body.active);
      }

      const updated = await prisma.fixedExpense.update({
        where: { id: req.params.id },
        data: updateData,
        include: { category: true }
      });
      res.json(updated);
    } catch (err: any) {
      console.error("Update error:", err);
      res.status(500).json({ error: "Erro ao atualizar despesa fixa" });
    }
  });

  // --- Block 2.6: Fixed Expense Engine ---
  app.post("/api/engine/process-fixed-expenses", authenticate, engineRateLimiter, async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).userId;
    try {
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
      const fixedExpenses = await prisma.fixedExpense.findMany({
        where: { userId, autoProvision: true, active: true, nextDueDate: { lte: ninetyDaysFromNow } },
      });

      let created = 0;
      for (const expense of fixedExpenses) {
        let currentDueDate = new Date(expense.nextDueDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        let iterations = 0;
        const MAX_ITERATIONS = 365; // Máximo de 1 ano de processamento retroativo
        while (currentDueDate <= today && iterations < MAX_ITERATIONS) {
          iterations++;
          const existing = await prisma.transaction.findFirst({
            where: {
              userId,
              fixedExpenseId: expense.id,
              competenceDate: currentDueDate,
              status: "PROJECTED"
            },
          });

          if (!existing) {
            await prisma.transaction.create({
              data: {
                description: expense.description,
                amount: expense.amount,
                type: "EXPENSE",
                status: "PROJECTED",
                competenceDate: currentDueDate,
                userId,
                fixedExpenseId: expense.id,
              },
            });
            created++;
          }

          const nextDate = new Date(currentDueDate);
          if (expense.recurrence === "DAILY") nextDate.setDate(nextDate.getDate() + 1);
          else if (expense.recurrence === "WEEKLY") nextDate.setDate(nextDate.getDate() + 7);
          else if (expense.recurrence === "MONTHLY") nextDate.setMonth(nextDate.getMonth() + 1);
          else if (expense.recurrence === "ANNUAL") nextDate.setFullYear(nextDate.getFullYear() + 1);
          else break;

          currentDueDate = nextDate;
        }

        if (iterations >= MAX_ITERATIONS) {
          console.warn(`[Engine] Limite de iterações atingido para despesa fixa ${expense.id}`);
        }

        await prisma.fixedExpense.update({
          where: { id: expense.id },
          data: { nextDueDate: currentDueDate },
        });
      }
      res.json({ success: true, created });
    } catch (err) {
      res.status(500).json({ error: "Engine failed" });
    }
  });

  // --- Block 2.4 & 2.5: Forecasting Engine ---
  app.post("/api/engine/generate-forecast", authenticate, engineRateLimiter, async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).userId;
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const transactions = await prisma.transaction.findMany({
        where: { userId, status: "REALIZED", competenceDate: { gte: sixMonthsAgo } },
      });

      const monthlyData: Record<string, { income: number; expense: number }> = {};
      transactions.forEach((t) => {
        const date = new Date(t.competenceDate);
        // Block 3.4: Fix monthKey with getMonth() + 1
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
        if (t.type === "INCOME") monthlyData[monthKey].income += Number(t.amount);
        else if (t.type === "EXPENSE") monthlyData[monthKey].expense += Number(t.amount);
      });

      const sortedMonths = Object.keys(monthlyData).sort();
      const last3Months = sortedMonths.slice(-3);
      let avgIncome = 0, avgExpense = 0;
      last3Months.forEach((m) => {
        avgIncome += monthlyData[m].income;
        avgExpense += monthlyData[m].expense;
      });
      avgIncome /= Math.max(last3Months.length, 1);
      avgExpense /= Math.max(last3Months.length, 1);

      const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.transaction.aggregate({ where: { userId, status: "REALIZED", type: "INCOME" }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { userId, status: "REALIZED", type: "EXPENSE" }, _sum: { amount: true } }),
      ]);
      let currentBalance = Number(incomeAgg._sum?.amount ?? 0) - Number(expenseAgg._sum?.amount ?? 0);

      const projectedBalances = [];
      for (let i = 1; i <= 3; i++) {
        currentBalance = currentBalance + avgIncome - (avgExpense * Math.pow(1.005, i));
        projectedBalances.push(currentBalance);
      }

      const expenses = last3Months.map(m => monthlyData[m].expense);
      let confidence: "LOW" | "MEDIUM" | "HIGH" = "LOW";
      if (expenses.length >= 2) {
        const mean = expenses.reduce((a,b)=>a+b,0)/expenses.length;
        const cv = mean === 0 ? 100 : (Math.sqrt(expenses.reduce((acc, v)=>acc+Math.pow(v-mean,2),0)/expenses.length)/mean)*100;
        confidence = cv < 15 ? "HIGH" : cv < 30 ? "MEDIUM" : "LOW";
      }

      const forecast = await prisma.forecast.create({
        data: { userId, monthsAhead: 3, projectedBalance: projectedBalances, confidence },
      });

      res.json({ success: true, data: { forecastId: forecast.id, projectedBalances, confidence } });
    } catch (err) {
      res.status(500).json({ error: "Forecast failed" });
    }
  });

  app.get("/api/forecasts", authenticate, async (req: Request, res: Response) => {
    try {
      const forecasts = await prisma.forecast.findMany({
        where: { userId: (req as AuthRequest).userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      res.json(forecasts);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar previsões" });
    }
  });

  // DELETE transaction
  app.delete("/api/transactions/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: { id: req.params.id, userId: (req as AuthRequest).userId }
      });
      if (!transaction) return res.status(404).json({ error: "Transação não encontrada" });
      await prisma.transaction.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ error: "Erro ao excluir transação" });
    }
  });

  // DELETE category
  app.delete("/api/categories/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const category = await prisma.category.findFirst({
        where: { id: req.params.id, userId: (req as AuthRequest).userId }
      });
      if (!category) return res.status(404).json({ error: "Categoria não encontrada" });
      await prisma.category.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ error: "Erro ao excluir categoria" });
    }
  });

  // DELETE fixed expense
  app.delete("/api/fixed-expenses/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const expense = await prisma.fixedExpense.findFirst({
        where: { id: req.params.id, userId: (req as AuthRequest).userId }
      });
      if (!expense) return res.status(404).json({ error: "Despesa fixa não encontrada" });
      await prisma.fixedExpense.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ error: "Erro ao excluir despesa fixa" });
    }
  });

  app.post("/api/auth/avatar", authenticate, upload.single("avatar"), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
      
      const userId = (req as AuthRequest).userId;
      
      // Converter para base64 data URL e salvar diretamente no banco
      const mimeType = req.file.mimetype;
      const base64 = req.file.buffer.toString("base64");
      const avatarUrl = `data:${mimeType};base64,${base64}`;

      await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
      });
      
      res.json({ avatarUrl });
    } catch (err) {
      console.error("Avatar upload error:", err);
      res.status(500).json({ error: "Erro no upload do avatar" });
    }
  });

  // Global API Error Handler
  app.use("/api", (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("API Error:", err);
    res.status(500).json({ error: "Erro interno na API", details: err.message });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    // Em produção ou na Vercel, servimos os arquivos estáticos da pasta 'dist'
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Wildcard route para suportar SPA (Single Page Application)
    // Apenas se não estiver na Vercel, pois a Vercel usa vercel.json rewrites
    if (!process.env.VERCEL) {
      app.get("*", (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  return app;
}

// Inicialização do servidor
const startServer = async () => {
  try {
    const app = await createApp();
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Server] Nexus Finance rodando em http://localhost:${PORT}`);
      console.log(`[Environment] Modo: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    console.error("[Server] Falha crítica ao iniciar:", err);
    process.exit(1);
  }
};

startServer();
