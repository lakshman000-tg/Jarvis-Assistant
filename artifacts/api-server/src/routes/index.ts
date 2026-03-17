import { Router, type IRouter } from "express";
import healthRouter from "./health";
import conversationsRouter from "./openai/conversations";
import ttsRouter from "./openai/tts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai", conversationsRouter);
router.use("/openai", ttsRouter);

export default router;
