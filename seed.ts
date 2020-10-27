import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
let prisma = new PrismaClient();
let main = async () => {
  await prisma.leave.deleteMany({});
  await prisma.exit.deleteMany({});
  await prisma.token.deleteMany({});
  await prisma.user.deleteMany({});
  let id = Math.floor(Math.random() * 1000000);
  await prisma.user.create({
    data: {
      id: `${id}`,
      firstName: "root",
      lastName: "root",
      password: await hash("root", 12),
      grade: 2,
      email: "mohamed@gmail.com",
      tel: "0540520590",
      function: "stagiare",
    },
  });
  id = Math.floor(Math.random() * 1000000);
  await prisma.user.create({
    data: {
      id: `${id}`,
      firstName: "mohamed",
      lastName: "gharbi",
      password: await hash("mohamed", 12),
      email: "mohamed@gmail.com",
      tel: "0540520590",
      function: "stagiare",
      grade: 0,
    },
  });
  /* id = Math.floor(Math.random() * 1000000); */
  /* await prisma.user.create({ */
  /*   data: { */
  /*     id: `${id}`, */
  /*     firstName: "rassim", */
  /*     lastName: "boukrouna", */
  /*     password: await hash("boukrouna", 12), */
  /*   }, */
  /* }); */
  /* id = Math.floor(Math.random() * 1000000); */
  /* await prisma.user.create({ */
  /*   data: { */
  /*     id: `${id}`, */
  /*     firstName: "aimen", */
  /*     lastName: "djemaa", */
  /*     password: await hash("djemaa", 12), */
  /*   }, */
  /* }); */
};

main().finally(() => prisma.$disconnect());
