import { PrismaClient } from "@prisma/client";
import { Supervisor } from "./notification";

export let getSupervisors = async (db: PrismaClient) => {
  let supervisors: Supervisor[] = await db.user.findMany({
    where: {
      grade: 2,
    },
    select: {
      id: true,
      notifications: true,
    },
  });
  return supervisors;
};
