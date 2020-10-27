import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
export let IsAdminMiddleWare: RequestHandler = async (req, res, next) => {
  let user = await req.db.user.findOne({
    where: { id: req.userId },
    select: {
      grade: true,
    },
  });
  if (!user) {
    res.status(403);
    next("vous n' etes pas autorizé 1");
    return;
  }

  if (user.grade !== 2) {
    res.status(403);
    next("vous n' etes pas autorizé 2");
    return;
  }
  next();
};
