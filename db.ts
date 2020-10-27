import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
  ],
});
