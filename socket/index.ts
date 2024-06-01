import { Server, Socket as SocketIO } from "socket.io";

interface SocketOptions {
  io: Server;
  options: { [key: string]: any } & { dbConnection: any };
}
export type CalleeFunction<T = any> = (
  ...args: T[]
) =>
  | boolean
  | Promise<boolean | { code: number; message?: string; stack?: any }>
  | { code: number; message?: string; stack?: any };
export const type = (o: any) =>
  Object.prototype.toString.call(o).substr(8).replace("]", "").toLowerCase();
interface SocketInstance {
  headers: { [key: string]: any };
  store: { [key: string]: any };
  header: { [key: string]: any };
  event: string;
  db: any[];
  data: { [key: string]: any };
  body: { [key: string]: any };
  privatebody: { [key: string]: any };
  privateheaders: { [key: string]: any };
  socket: SocketIO;
  options: SocketOptions;
  callee: CalleeFunction[];
}

export default class Socket {
  io: Server;
  registry: { [key: string]: any } = {} as any;
  callee: CalleeFunction[] = [];
  event: string = "";
  // eslint-disable-next-line no-unused-vars
  constructor(options: SocketOptions) {
    this.io = options.io;
    this.io.on("connection", (socket) => {
      Object.keys(this.registry).forEach((event) => {
        socket.on(event, (data) => {
          const ip = socket.handshake.address;
          const instance: SocketInstance = {
            io: options.io,
            socket,
            event,
            store: { ip },
          } as any;
          console.log(">> ", "Connected successfully");
          instance.headers = instance.socket.handshake.headers;
          instance.privateheaders = instance.socket.handshake.headers;
          instance.options = options;
          instance.callee = this.registry[event];
          console.log(`<<[${ip}] Received ` + event + " => ", data);

          const emitError = (data: any) => {
            console.error("Sent Error => ", data);
            instance.socket.emit("error", data);
          };

          const emit = (data: any) => {
            console.log(">> Sent (" + instance.event + ") => ", data);
            instance.socket.emit(instance.event, data);
          };

          let index = 0;
          instance.data = instance.privatebody = data;
          const callNext = () => {
            if (index < instance.callee.length) {
              const fn = instance.callee[index];
              try {
                const res = fn(data, instance);
                if (type(res) === "promise") {
                  (res as Promise<boolean>).then((v) => {
                    if (v === true) {
                      index++;
                      callNext();
                    } else {
                      if (!v)
                        emitError({
                          code: 500,
                          message: "SocketError: Function failed",
                        });
                      else {
                        if ((v as any).code === 200) emit(v);
                        else emitError(v);
                      }
                    }
                  });
                } else if (res === true) {
                  index++;
                  callNext();
                } else if (type(res) === "error") {
                  emitError({
                    code: 500,
                    message:
                      "SocketError: " +
                      ((res as any).message
                        ? (res as any).message
                        : "Function failed"),
                    stack: res,
                  });
                } else {
                  const result = res;
                  if (!res)
                    emitError({
                      code: 500,
                      message: "SocketError: Function failed",
                    });
                  else {
                    if ((result as any).code === 200) emit(result);
                    else emitError(result);
                  }
                }
              } catch (e: any) {
                emitError({
                  code: 500,
                  message:
                    "SocketError: " +
                    (e.message ? e.message : " Function failed"),
                  stack: e,
                });
              }
            }
          };
          callNext();
        });
      });
    });
  }

  on = function (event: string) {
    this.registry[event] = [];
    this.callee = this.registry[event];
    return this;
  };

  map = (
    type: "headers" | "body",
    keys: [string],
    success: CalleeFunction,
    fail: CalleeFunction
  ) => {
    const types = {
      headers: "header",
      body: "body",
    };
    const fn = (_: any, instance: any) => {
      if (!instance["private" + type])
        return { code: 400, message: "Invalid request" };
      let checks = 0;
      keys.forEach((k) => {
        if (instance["private" + type].hasOwnProperty(k)) {
          instance[types[type]] = instance[types[type]] || {};
          instance[types[type]][k] = instance["private" + type][k];
          checks++;
        }
      });
      try {
        if (checks === keys.length) return success ? success(true) : true;
        return fail
          ? fail({ code: 403, message: "Bad Request" })
          : { code: 403, message: "Bad Request" };
      } catch (e) {
        console.error(e);
        return { code: 500, message: "Server Error", stack: e };
      }
    };
    this.callee.push(fn);
    return this;
  };

  mapBody = (keys: [string], success: CalleeFunction, fail: CalleeFunction) => {
    this.map("body", keys, success, fail);
    return this;
  };
  mapHeader = (keys: [string], success: CalleeFunction, fail: CalleeFunction) =>
    this.map("headers", keys, success, fail);

  mapDB = (...args: [any]) => {
    const fn = (_: any, instance: SocketInstance) => {
      instance.db = args;
      return true;
    };
    this.callee.push(fn);
    return this;
  };

  use = (type: "db" | "headers" | "body" | "store", callback: Function) => {
    const types = {
      db: "db",
      headers: "header",
      body: "body",
      store: "store",
    };
    const fn = (_: any, instance: any) => {
      try {
        if (callback) {
          return callback(instance[types[type]], instance);
        } else return true;
      } catch (e) {
        console.error(e);
      }
    };
    this.callee.push(fn);
    return this;
  };

  useHeader = (callback: CalleeFunction) => this.use("headers", callback);
  useDB = (callback: CalleeFunction) => this.use("db", callback);
  useBody = (callback: CalleeFunction) => this.use("body", callback);
  useStore = (callback: CalleeFunction) => this.use("store", callback);
}
