import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import cors from "cors";

// Strictly allow development and desktop Electron container origins
export const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
];

export const corsOriginValidator = (origin, callback) => {
  // Allow requests with no origin (desktop Electron app, local scripts, tools)
  if (!origin) {
    return callback(null, true);
  }
  if (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.startsWith("file://")
  ) {
    return callback(null, true);
  }
  return callback(new Error(`CORS Policy: Origin '${origin}' is not permitted.`));
};

// General API Rate limiting: 1200 requests per 15 min per IP (supports 2s live desktop telemetry)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});

// Strict Auth rate limiting to prevent brute-force attacks on login/register: 30 attempts per 15 min
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts from this IP. Please try again after 15 minutes.",
  },
});

// Custom XSS protection sanitizer middleware
// NOTE: Forward slashes are deliberately NOT encoded to preserve file paths in request bodies.
export const xssSanitizer = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === "string") {
      return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
    }
    if (typeof value === "object" && value !== null) {
      for (const key in value) {
        value[key] = sanitizeValue(value[key]);
      }
    }
    return value;
  };

  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};

export const configureSecurity = (app) => {
  // Use Helmet for secure HTTP headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // Strict CORS policy avoiding wildcard with credentials
  app.use(
    cors({
      origin: corsOriginValidator,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

  // Sanitization against NoSQL injection
  app.use(mongoSanitize());

  // Custom XSS Sanitizer
  app.use(xssSanitizer);
};

