import { Router, Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as Yup from "yup";
import { compare } from "bcryptjs";
let AuthRouter = Router();

interface LoginPayload {
  id: string;
  password: string;
}
let loginValidationMiddleWare = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let scheme = Yup.object().shape({
    id: Yup.string()
      .trim("Veuillez entrer votre matricule")
      .required("le matricule est requis"),
    password: Yup.string()
      .min(3, "mot de passe doit au moins contenir 3 caractéres")
      .required("le mot de passe est requis"),
  });

  try {
    req.body = await scheme.validate(req.body, { stripUnknown: true });
    next();
  } catch (error) {
    res.status(400);
    next(error.errors[0]);
  }
};
AuthRouter.post("/login", loginValidationMiddleWare, async (req, res, next) => {
  let { password, id } = req.body as LoginPayload;

  let user = await req.db.user.findOne({
    where: {
      id,
    },
    select: {
      id: true,
      password: true,
      grade: true,
    },
  });

  if (!user) {
    res.status(404);
    next("vos identifiants sont incorrectes");
    return;
  }

  let isValid = await compare(password, user.password);
  if (!isValid) {
    res.status(401);
    next("vos identifiants sont incorrectes");
    return;
  }
  let token = jwt.sign(
    { id: user.id, grade: user.grade },
    process.env.SECRET || "mysecretkey"
  );
  res.send({
    grade: user.grade,
    access_token: token,
  });
});

AuthRouter.post("/", async (req, res, next) => {
  let token: string = req.body.token || "";
  if (token) {
    res.status(400);
    next("le token de registration est requis");
    return;
  }

  await req.db.token.create({
    data: {
      value: token,
      user: {
        connect: {
          id: req.userId,
        },
      },
    },
  });
  res.status(201);
  res.end();
});

export { AuthRouter };
/**
une vulnerabilité (failles): est un defaults  dans le systeme(conception, configuration, constructionk) qui expose le systeme à des menaces possible
*/
