import { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { ToyotaPlanController } from "../src/modules/toyotaPlan/toyotaPlan.controller";
import { ToyotaPlanService } from "../src/modules/toyotaPlan/toyotaPlan.service";

describe("ToyotaPlanController", () => {
  it("passes request metadata to the service", async () => {
    const service = {
      generateSubscriptionLink: vi.fn().mockResolvedValue({
        success: true,
        link: "https://sdx.suscripcion.toyotaplan.com.ar/?external=abc",
        model: "HILUX",
        plan: "PLAN 100%",
        amount: 558824.14
      })
    } as unknown as ToyotaPlanService;

    const controller = new ToyotaPlanController(service);
    const req = {
      body: {
        slug: "hilux-4x4-dc-dx-24-tdi-at-plan-100"
      },
      ip: "127.0.0.1",
      get: vi.fn().mockReturnValue("vitest-agent")
    } as unknown as Request;
    const res = {
      json: vi.fn()
    } as unknown as Response;
    const next = vi.fn();

    await controller.generateLink(req, res, next);

    expect(service.generateSubscriptionLink).toHaveBeenCalledWith(
      "hilux-4x4-dc-dx-24-tdi-at-plan-100",
      {
        ip: "127.0.0.1",
        userAgent: "vitest-agent"
      }
    );
    expect(next).not.toHaveBeenCalled();
  });
});
