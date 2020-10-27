import asyncRedis from "async-redis";
import Express from "express";
import jwt from "jsonwebtoken";
import socketIo from "socket.io";
import { db } from "./db";
import { Notification } from "./interfaces";
let port = process.env.PORT || 3333;
let host = process.env.HOST || "localhost";
export const redis = asyncRedis.createClient();
export let server = Express();

let http = server.listen(+port, host, () => {
  console.log(`server listening at http://${host}:${port}`);
});

export let io = socketIo(http);
/* les sockets */

io.on("connection", (socket) => {
  console.log("un utilisateur connecté avec socket id =", socket.id);
  // ndemandé l'utilisateur yentitifier roho

  // n'enregister f redis
  socket.emit("auth");

  socket.on("auth", (payload: { token: string }) => {
    let resolve = async () => {
      let { token } = payload;
      try {
        let user = jwt.verify(token, process.env.SECRET || "mysecretkey") as {
          id: string;
        };
        if (!user || !user.id) return;
        await redis.sadd(`sockets:${user.id}`, socket.id);
        await redis.set(`user:${socket.id}`, user.id);
        let result = await db.user.update({
          where: { id: user.id },
          data: { notifications: "[]" },
          select: { notifications: true },
        });
        if (!result) {
          socket.disconnect(true);
          return;
        }
        // hna matensach
        let notifications = JSON.parse(result.notifications) as Notification[];
        if (notifications.length > 0) {
          socket.emit("notif", notifications);
          console.log("hna");
        }
      } catch (error) {
        console.log("error auth");
        socket.disconnect(true);
        return;
      }
    };
    resolve();
  });
  // nekder nebda neb3at les notification
  socket.on("disconnect", () => {
    let disconnect = async () => {
      let userId = ((await redis.get(
        `user:${socket.id}`
      )) as unknown) as string;
      console.log("user", userId);
      if (!userId) {
        return;
      }
      try {
        console.log(`sockets:${userId}`);
        await redis.srem(`sockets:${userId}`, socket.id);
      } catch (error) {
        console.log("ghelta hna", error);
      }
      console.log(`delete socket = ${socket.id} user with id = ${userId} `);
    };
    disconnect();
    console.log("disconnect");
  });
});
