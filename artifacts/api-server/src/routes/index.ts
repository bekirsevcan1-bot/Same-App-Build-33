import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ustasRouter from "./ustas";
import requestsRouter from "./requests";
import locationsRouter from "./locations";
import seedRouter from "./seed";
import registrationRouter from "./registration";
import notificationsRouter from "./notifications";
import supportRouter from "./support";
import statsRouter from "./stats";
import storageRouter from "./storage";
import devicesRouter from "./devices";
import paymentRouter from "./payment";
import antalyaNeighborhoodsRouter from "./antalya-neighborhoods";
import authRouter, { loginHandler } from "./auth";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/register", registrationRouter);
router.use("/auth", authRouter);
router.use("/admin", adminRouter);
// Both login paths are intentionally supported for web clients and older deployments.
router.post("/login", loginHandler);
router.use(notificationsRouter);
router.use("/support", supportRouter);
router.use("/stats", statsRouter);
router.use(ustasRouter);
router.use(requestsRouter);
router.use(locationsRouter);
router.use(seedRouter);
router.use(storageRouter);
router.use(devicesRouter);
router.use(paymentRouter);
router.use(antalyaNeighborhoodsRouter);

export default router;
