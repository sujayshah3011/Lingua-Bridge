import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sarvamRouter from "./sarvam";
import sttRouter from "./stt";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/sarvam", sarvamRouter);
router.use("/stt", sttRouter);

export default router;
