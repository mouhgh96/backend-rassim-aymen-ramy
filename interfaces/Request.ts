import { PrismaClient } from "@prisma/client";
import { RequestHandler } from "express";
export interface MyRequest extends RequestHandler {
  db: PrismaClient;
}
