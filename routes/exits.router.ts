import { add, addDays, isBefore } from "date-fns";
import { Router, Response, Request, NextFunction } from "express";
import * as Yup from "yup";
import { IsAdminMiddleWare } from "../middelwares";
import {
  ExitUpdateInput,
  ExitWhereInput,
  ExitWhereUniqueInput,
} from "@prisma/client";
import { getSupervisors } from "../utils";
import { Notification } from "../interfaces";
import { scheduler } from "../notification";

import { EXIT_ADDED, EXIT_RESPONSE } from "../events";
let ExitsRouter = Router();

interface ExitPayload {
  exitHour: string;
  returnHour: string;
  description: string;
  destination: string;
  exitDay: string;
}
let ExitValidationMiddleWare = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let scheme = Yup.object().shape({
    exitHour: Yup.number()
      .integer("Veuillez entrer une description")
      .min(8, "l'heure de sortie doit etre entre 8h et 16h")
      .max(16, "l'heure de sortie doit etre entre 8h et 16h")
      .required("l'heure de sorite est requise"),
    returnHour: Yup.number()
      .integer("Veuillez entrer une description")
      .min(8, "l'heure d'entrée doit etre entre 8h et 16h")
      .max(16, "l'heure d'entrée doit etre entre 8h et 16h")
      .required("l'heure d'entrée est requise"),
    destination: Yup.string().trim().required("une destination est requise"),
    description: Yup.string().trim().required("une description est requise"),
    exitDay: Yup.date()
      .min(new Date())
      .required("le jour de sortie est requis"),
  });

  try {
    req.body = await scheme.validate(req.body, { stripUnknown: true });
    next();
  } catch (error) {
    res.status(400);
    next(error.errors[0]);
  }
};
ExitsRouter.post("/", ExitValidationMiddleWare, async (req, res, next) => {
  let {
    exitHour,
    returnHour,
    exitDay,
    description,
    destination,
  } = req.body as ExitPayload;
  let data = {
    exitDay: new Date(Date.parse(exitDay)),
    description,
    returnHour: +returnHour,
    exitHour: +exitHour,
    destination,
    user: {
      connect: {
        id: req.userId,
      },
    },
  };

  let exit = await req.db.exit.create({
    data,
    select: {
      id: true,
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
      exitDay: true,
      description: true,
      returnHour: true,
      exitHour: true,
      destination: true,
      updatedAt: true,
    },
  });
  // demande de sortie ajouté

  let to = await getSupervisors(req.db);
  let notif: Notification = {
    title: "nouvelle demandé de sortie",
    body: `${exit.user.lastName} ${exit.user.firstName} a demandé une sortie`,
    extra: {
      path: `/exits/${exit.id}`,
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
  scheduler.emit(EXIT_ADDED, to, [notif]);
  res.status(201);
  res.send(exit);
});

ExitsRouter.patch("/:id", IsAdminMiddleWare, async (req, res, next) => {
  let { id } = req.params;
  console.log("hna");
  let { decision } = req.body as { decision: boolean };
  let motif: string = req.body.motif ?? "";
  let data: ExitUpdateInput = {
    state: decision ? 1 : 2,
  };
  let exit = await req.db.exit.findOne({
    where: {
      id: +id,
    },
  });
  if (!exit) {
    res.status(404);
    res.end();
    return;
  }
  if (!decision) {
    // ghadwa nverifyiha
    if (!motif) {
      res.status(400);
      next("veuillez donnez un motif");
      return;
    }
    data = {
      ...data,
      motif,
    };
  }
  let newExit = await req.db.exit.update({
    where: {
      id: +id,
    },
    data,
    select: {
      description: true,
      id: true,
      motif: true,
      exitDay: true,
      exitHour: true,
      returnHour: true,
      updatedAt: true,
      state: true,
      destination: true,
      user: {
        select: {
          notifications: true,
          id: true,
          firstName: true,
          lastName: true,
          function: true,
        },
      },
    },
  });

  let notif: Notification = {
    title: decision
      ? `votre demande de sortie à été accepteé`
      : `votre demande  de sortie à été annulée`,
    body: decision ? `Congratulation` : `${motif}`,
    extra: {
      path: `/exits/${newExit.id}`,
    },
  };
  let notifications: Notification[] =
    JSON.parse(newExit.user.notifications || "[]") || [];
  notifications.push(notif);
  await req.db.user.update({
    where: { id: newExit.user.id },
    data: { notifications: JSON.stringify(notifications) },
  });
  scheduler.emit(EXIT_RESPONSE, [newExit.user], [notif]);
  //@ts-ignore
  delete newExit.user.notifications;
  res.send(newExit);
});

ExitsRouter.get("/", async (req, res, next) => {
  let where: ExitWhereInput = {
    userId: req.userId,
    exitDay: {
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
      userId: { not: req.userId },
      exitDay: {
        gt: new Date(),
      },
    };
  }
  let exits = await req.db.exit.findMany({
    where,
    select: {
      description: true,
      id: true,
      motif: true,
      exitDay: true,
      exitHour: true,
      returnHour: true,
      updatedAt: true,
      state: true,
      destination: true,
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  if (!exits) {
    res.status(404);
    res.end();
    return;
  }
  res.send(exits);
});

ExitsRouter.get("/:id", async (req, res, next) => {
  let where: ExitWhereUniqueInput = {
    id: +req.params.id as number,
  };
  let exit = await req.db.exit.findOne({
    where,
    select: {
      description: true,
      id: true,
      motif: true,
      exitDay: true,
      exitHour: true,
      returnHour: true,
      updatedAt: true,
      state: true,
      destination: true,
      user: {
        select: { id: true, firstName: true, lastName: true, function: true },
      },
    },
  });
  if (!exit) {
    res.status(404);
    res.end();
    return;
  }
  if (req.grade !== 2 && exit.user.id !== req.userId) {
    res.status(403);
    res.end();
    return;
  }
  res.send(exit);
});

ExitsRouter.put("/:id", async (req, res, next) => {
  let { id } = req.params;

  let exit = await req.db.exit.findOne({
    where: {
      id: +id,
    },
    select: {
      id: true,
      user: {
        select: { id: true },
      },
      state: true,
      exitDay: true,
    },
  });
  if (!exit) {
    res.status(404);
    res.end();
    return;
  }
  if (
    req.userId !== exit.user.id ||
    exit.state !== 0 ||
    isBefore(exit.exitDay, new Date())
  ) {
    res.status(403);
    res.end();
    return;
  }
  let data = {};
  if (req.body.exitDay) {
    data = {
      ...data,
      exitDay: new Date(req.body.exitDay),
    };
  }
  if (req.body.description) {
    data = {
      ...data,
      description: req.body.description,
    };
  }
  if (req.body.destination) {
    data = {
      ...data,
      destination: req.body.destination,
    };
  }
  if (req.body.exitHour) {
    data = {
      ...data,
      exitHour: req.body.exitHour,
    };
  }
  if (req.body.returnHour) {
    data = {
      ...data,
      returnHour: req.body.returnHour,
    };
  }
  console.log("modifcation", data);
  let result = await req.db.exit.update({
    where: {
      id: +id,
    },
    data,
  });
  res.send(result);
});
export { ExitsRouter };
