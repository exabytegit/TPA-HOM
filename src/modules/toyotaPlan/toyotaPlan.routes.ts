import { Router } from "express";
import { toyotaPlanController } from "./toyotaPlan.controller";

export const toyotaPlanRouter = Router();

toyotaPlanRouter.post("/generate-link", toyotaPlanController.generateLink);
