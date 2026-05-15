import { Router } from "express";
import { generateLinkRateLimiter } from "../../middlewares/rateLimit";
import { toyotaPlanController } from "./toyotaPlan.controller";

export const toyotaPlanRouter = Router();

toyotaPlanRouter.post("/generate-link", generateLinkRateLimiter, toyotaPlanController.generateLink);
