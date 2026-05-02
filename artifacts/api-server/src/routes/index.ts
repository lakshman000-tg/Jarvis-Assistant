import { Router, type IRouter } from "express";
import healthRouter from "./health";
import conversationsRouter from "./openai/conversations";
import ttsRouter from "./openai/tts";
import youtubeSearchRouter from "./youtube/search";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai", conversationsRouter);
router.use("/openai", ttsRouter);
router.use("/youtube", youtubeSearchRouter);

export default router;
