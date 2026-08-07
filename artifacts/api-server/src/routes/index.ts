import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import auth2faRouter from "./auth-2fa";
import dashboardRouter from "./dashboard";
import curriculumRouter from "./curriculum";
import questionsRouter from "./questions";
import testsRouter from "./tests";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(auth2faRouter);
router.use(dashboardRouter);
router.use(curriculumRouter);
router.use(questionsRouter);
router.use(testsRouter);

export default router;
