import { add, isAfter, isBefore } from "date-fns";
import { Router, Response, Request, NextFunction } from "express";
import * as Yup from "yup";
import { compare } from "bcryptjs";
import { IsAdminMiddleWare } from "../middelwares";
import { LeaveWhereInput, LeaveWhereUniqueInput } from "@prisma/client";
import { scheduler } from "../notification";
import { LEAVE_ADDED, LEAVE_RESPONSE } from "../events";
import { Notification } from "../interfaces";

let LeavesRouter = Router();

interface LeavePayload {
  leaveDay: string;
  duration: number;
  description: string;
  destination: string;
}
let LeaveValidationMiddleWare = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let scheme = Yup.object().shape({
    description: Yup.string()
      .trim("Veuillez entrer une description")
      .required("la description est requis"),
    destination: Yup.string()
      .trim("Veuillez entrer une destination")
      .required("la destination est requis"),
    duration: Yup.number()
      .integer()
      .positive()
      .required("la duré en jours est requise"),
    leaveDay: Yup.date()

      .min(new Date(), "le jour doit congé doit au moin commencé demain")
      .required("la jour de congé est requis"),
  });

  try {
    req.body = await scheme.validate(req.body, { stripUnknown: true });
    next();
  } catch (error) {
    res.status(400);
    next(error.errors[0]);
  }
};
LeavesRouter.post("/", LeaveValidationMiddleWare, async (req, res, next) => {
  let {
    leaveDay,
    duration,
    description,
    destination,
  } = req.body as LeavePayload;
  if (req.grade == 2) {
    res.status(403);
    res.end();
    return;
  }
  let data = {
    leaveDay: new Date(Date.parse(leaveDay)),
    description,
    duration,
    destination,
    user: {
      connect: {
        id: req.userId,
      },
    },
  };

  /* res.end(); */
  /* return; */
  let leave = await req.db.leave.create({
    data,
    select: {
      id: true,
      leaveDay: true,
      duration: true,
      description: true,
      destination: true,
      state: true,
      motif: true,
      updatedAt: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          id: true,
        },
      },
    },
  });
  let to = await req.db.user.findMany({
    where: { grade: 2 },
    select: { id: true, notifications: true },
  });
  let notif: Notification = {
    title: "nouvelle demande de congé",
    body: `${leave.user.lastName} ${leave.user.firstName} a demandé un congé`,
    extra: {
      path: `/leaves/${leave.id}`,
    },
  };
  to.forEach(async (user) => {
    let tmp = await req.db.user.findOne({
      where: { id: user.id },
      select: { notifications: true },
    });
    let notifications: Notification[] =
      JSON.parse(tmp?.notifications || "[]") || [];
    notifications.push(notif);
    await req.db.user.update({
      where: { id: user.id },
      data: { notifications: JSON.stringify(notifications) },
    });
  });
  scheduler.emit(LEAVE_ADDED, to, [notif]);
  res.status(201);
  res.send(leave);
});

LeavesRouter.patch("/:id", IsAdminMiddleWare, async (req, res, next) => {
  let { id } = req.params;
  let { decision } = req.body as { decision: boolean };
  let motif = req.body.motif || "";
  let data = {
    state: decision ? 1 : 2,
  };
  let leave = await req.db.leave.findOne({
    where: {
      id: +id,
    },
  });
  if (!leave) {
    res.status(404);
    res.end();
    return;
  }
  if (!decision) {
    if (!motif) {
      res.status(400);
      next("veuillez donnez un motif");
      return;
    }
    data = {
      ...data,
      //@ts-ignore
      motif,
    };
  }
  let newLeave = await req.db.leave.update({
    where: {
      id: +id,
    },
    data,
    select: {
      description: true,
      id: true,
      motif: true,
      leaveDay: true,
      duration: true,
      createdAt: true,
      updatedAt: true,
      destination: true,
      state: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          function: true,
          notifications: true,
        },
      },
    },
  });
  let notif: Notification = {
    title: decision
      ? `votre demande à été accepteé`
      : `votre demande à été annulée`,
    body: decision ? `Congratulation` : `${motif}`,
    extra: {
      path: `/leaves/${newLeave.id}`,
    },
  };
  let notifications: Notification[] =
    JSON.parse(newLeave.user.notifications || "[]") || [];
  notifications.push(notif);
  await req.db.user.update({
    where: { id: newLeave.user.id },
    data: { notifications: JSON.stringify(notifications) },
  });

  scheduler.emit(LEAVE_RESPONSE, [newLeave.user], [notif]);
  //@ts-ignore
  delete newLeave.user.notifications;
  res.send(newLeave);
});

interface LeavePut {
  leaveDay?: string;
  duration?: number;
  description?: string;
  destination?: string;
}
let LeavePutValidationMiddleWare = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let scheme = Yup.object().shape({
    description: Yup.string().trim("Veuillez entrer une description"),
    duration: Yup.number().integer().positive(),
    leaveDay: Yup.date().min(
      add(Date.now(), { days: 1 }),
      "le jour doit congé doit au moin commencé demain"
    ),
    destination: Yup.string().trim("Veuillez entrer une destination"),
  });

  try {
    req.body = await scheme.validate(req.body, { stripUnknown: true });
    next();
  } catch (error) {
    res.status(400);
    next(error.errors[0]);
  }
};
LeavesRouter.put(
  "/:id",
  LeavePutValidationMiddleWare,
  async (req, res, next) => {
    let { id } = req.params;
    let { leaveDay, duration, description, destination } = req.body as LeavePut;

    let leave = await req.db.leave.findOne({
      where: {
        id: +id,
      },
      select: {
        id: true,
        user: {
          select: { id: true },
        },
        state: true,
        leaveDay: true,
      },
    });
    if (!leave) {
      res.status(404);
      res.end();
      return;
    }
    if (
      req.userId !== leave.user.id ||
      leave.state !== 0 ||
      isBefore(leave.leaveDay, new Date())
    ) {
      res.status(403);
      res.end();
      return;
    }
    let data = {};
    if (leaveDay) {
      data = {
        ...data,
        leaveDay: new Date(leaveDay),
      };
    }
    if (description) {
      data = {
        ...data,
        description,
      };
    }
    if (destination) {
      data = {
        ...data,
        destination,
      };
    }
    if (duration) {
      data = {
        ...data,
        duration,
      };
    }
    console.log("data", req.body);

    let result = await req.db.leave.update({
      where: {
        id: +id,
      },
      data,
    });
    res.send(result);
  }
);
LeavesRouter.get("/", async (req, res, next) => {
  let where: LeaveWhereInput = {
    userId: req.userId,
    leaveDay: {
      gt: new Date(),
    },
    user: {
      grade: {
        lt: 2,
      },
    },
  };
  if (req.grade === 2) {
    where = {
      /* state: 0, */
      userId: { not: req.userId },
      leaveDay: {
        gt: new Date(),
      },
    };
  }
  let leaves = await req.db.leave.findMany({
    where,
    select: {
      description: true,
      id: true,
      motif: true,
      leaveDay: true,
      duration: true,
      createdAt: true,
      updatedAt: true,
      destination: true,
      state: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          function: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  if (!leaves) {
    res.status(404);
    res.end();
    return;
  }
  res.send(leaves);
});

LeavesRouter.get("/:id", async (req, res, next) => {
  let where: LeaveWhereUniqueInput = {
    id: +req.params.id as number,
  };
  let leave = await req.db.leave.findOne({
    where,
    select: {
      description: true,
      id: true,
      motif: true,
      leaveDay: true,
      duration: true,
      createdAt: true,
      updatedAt: true,
      destination: true,
      state: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          function: true,
        },
      },
    },
  });
  console.log(leave);
  if (!leave) {
    res.status(404);
    res.end();
    return;
  }
  if (req.grade !== 2 && leave.user.id !== req.userId) {
    res.status(403);
    res.end();
    return;
  }
  res.send(leave);
});
export { LeavesRouter };
