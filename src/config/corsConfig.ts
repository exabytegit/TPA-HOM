import { CorsOptions } from "cors";
import { env, NodeEnv } from "./env";
import { AppError } from "../utils/appError";

interface CorsConfigInput {
  nodeEnv: NodeEnv;
  allowedOrigins: string[];
}

export const createCorsConfig = ({ nodeEnv, allowedOrigins }: CorsConfigInput): CorsOptions => ({
  origin: (origin, callback) => {
    if (!origin && nodeEnv !== "production") {
      return callback(null, true);
    }

    if (origin && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new AppError(403, "Not allowed by CORS", "CORS_ORIGIN_NOT_ALLOWED"));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
  credentials: false
});

export const corsConfig = createCorsConfig({
  nodeEnv: env.NODE_ENV,
  allowedOrigins: env.CORS_ALLOWED_ORIGINS
});

export const corsAllowedOrigins = env.CORS_ALLOWED_ORIGINS;
