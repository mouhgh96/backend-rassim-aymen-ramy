import { EventEmitter } from "events";
import { LEAVE_ADDED, LEAVE_RESPONSE } from "./events";
import { Notification } from "./interfaces";
import { io, redis } from "./server";

export type Supervisor = { id: string };

interface Payload {
  to: Supervisor[];
  notifications: Notification[];
}
//@ts-ignore
class Handler extends EventEmitter {
  //@ts-ignore
  emit(event: string, to: Supervisor[], notifications: Notification[]): void {
    super.on(event, () => {
      console.log("nikmok");
      this.handler({ to, notifications });
    });
    super.emit(event, {
      to,
      notifications,
    });
  }
  async handler({
    to,
    notifications,
  }: {
    to: Supervisor[];
    notifications: Notification[];
  }) {
    to.forEach(async ({ id }) => {
      let sockets = ((await redis.smembers(
        `sockets:${id}`
      )) as unknown) as string[];
      sockets.forEach((socket) => {
        io.sockets.in(socket).emit("notif", notifications);
      });
    });
  }
}
export let scheduler = new Handler();
