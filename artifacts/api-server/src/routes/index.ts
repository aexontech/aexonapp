import { Router, type IRouter } from "express";
import healthRouter from "./health";
import xenditRouter from "./xendit";

const router: IRouter = Router();

router.use(healthRouter);
router.use(xenditRouter);

export default router;
