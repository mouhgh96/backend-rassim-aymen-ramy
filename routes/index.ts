import { Router } from "express";
import { AuthRouter } from "./auth";
import { AuthMiddleWare } from "../middelwares";
import { LeavesRouter } from "./leaves.router";
import { ExitsRouter } from "./exits.router";

let ApiRouter = Router();

ApiRouter.use("/leaves", AuthMiddleWare, LeavesRouter);
ApiRouter.use("/exits", AuthMiddleWare, ExitsRouter);
ApiRouter.use("/auth", AuthRouter);
export { ApiRouter };
