import { NextFunction, Request, Response } from "express";
import { generateLinkBodySchema } from "./toyotaPlan.schemas";
import { toyotaPlanService, ToyotaPlanService } from "./toyotaPlan.service";

export class ToyotaPlanController {
  constructor(private readonly service: ToyotaPlanService = toyotaPlanService) {}

  generateLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = generateLinkBodySchema.parse(req.body);
      const result = await this.service.generateSubscriptionLink(body.slug);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const toyotaPlanController = new ToyotaPlanController();
