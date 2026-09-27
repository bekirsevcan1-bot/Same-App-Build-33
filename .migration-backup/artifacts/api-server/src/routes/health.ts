import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function healthHandler(_req: Parameters<import("express").RequestHandler>[0], res: Parameters<import("express").RequestHandler>[1]) {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
}

router.get("/healthz", healthHandler);
router.get("/health", healthHandler);

export default router;
