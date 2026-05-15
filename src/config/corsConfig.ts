import { CorsOptions } from "cors";
import { env } from "./env";
import { AppError } from "../utils/appError";

const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin && env.NODE_ENV !== "production") {
      callback(null, true);
      return;
    }

    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError(403, "Not allowed by CORS", "CORS_ORIGIN_NOT_ALLOWED"));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
  credentials: false
};

export const corsAllowedOrigins = allowedOrigins;
