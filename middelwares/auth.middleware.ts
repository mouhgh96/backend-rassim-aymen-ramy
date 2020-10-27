import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
export let AuthMiddleWare: RequestHandler = async (req, res, next) => {
  let payload: string = req.headers.authorization || "";
  if (!payload.trim()) {
    res.status(401);
    next("veuillez vous connecter");
    return;
  }

  let result = payload.split(" ");
  if (result.length < 2) {
    res.status(401);
    next("veuillez vous connecter");
    return;
  }
  let token = result[1];
  try {
    let obj = jwt.verify(token, process.env.SECRET || "mysecretkey");
    // @ts-ignore
    req.userId = obj.id;
    // @ts-ignore
    req.grade = +obj.grade;
    next();
  } catch (error) {
    res.status(401);
    next("veuillez vous connecter");
    return;
  }
};
