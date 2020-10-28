import { Router } from "express";

export let UsersRouter = Router();

UsersRouter.get("/me", async (req, res, next) => {
  let user = await req.db.user.findOne({
    where: {
      id: req.userId,
    },
  });
  // @ts-ignore
  delete user.password;
  res.send(user);
});
