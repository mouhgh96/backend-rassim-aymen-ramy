import { server } from "./server";
import cors from "cors";
import Express, { NextFunction, Request, Response } from "express";
import { ApiRouter } from "./routes";
import { db } from "./db";
import { PrismaClient } from "@prisma/client";
declare global {
  namespace Express {
    interface Request {
      db: PrismaClient;
      userId: string;
      grade: number;
    }
  }
}
/* prisma.$on("query", (e) => { */
/*   e.query, console.log(e); */
/* }); */

server.use(cors());
server.options("*", cors());
server.use(Express.json());
server.use(Express.urlencoded({ extended: true }));

server.use("/api", (req, _, next) => {
  req.db = db;
  next();
});
server.use("/api", ApiRouter);

server.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(res.statusCode || 500);
  res.send({
    error: err || "une error inconnue est survenu",
  });
});
