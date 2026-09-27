import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = new Set([
  "https://same-app-build-usta-cepte-web.vercel.app",
  ...(process.env.REPLIT_DEV_DOMAIN ? [`https://${process.env.REPLIT_DEV_DOMAIN}`] : []),
  ...(process.env.CORS_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean),
]);

app.use(cors({
  origin(origin, callback) {
    // Non-browser health checks and server-to-server calls do not send Origin.
    if (!origin || allowedOrigins.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed by CORS"));
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
