import { EventEmitter } from "node:events";
import { initTRPC } from "@trpc/server";
import { createHTTPServer, CreateHTTPContextOptions } from "@trpc/server/adapters/standalone";
import { applyWSSHandler, CreateWSSContextFnOptions } from "@trpc/server/adapters/ws";
import { observable } from "@trpc/server/observable";
import ws from "ws";
import cors from "cors";
import z from "zod";

const ee = new EventEmitter();

const createContext = (options: CreateHTTPContextOptions | CreateWSSContextFnOptions) => ({
  ...options,
  ee,
});

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();
const publicProcedure = t.procedure;

type Message = {
  text: string;
  _id: string;
};

const appRouter = t.router({
  sayHello: publicProcedure.query(() => {
    return "Hello";
  }),

  addNewMessage: publicProcedure.input(z.object({ text: z.string() })).mutation(({ ctx, input }) => {
    const newMessage = {
      ...input,
      _id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    };

    ctx.ee.emit("newMessage", newMessage);

    return newMessage;
  }),

  onNewMessage: publicProcedure.subscription(({ ctx }) => {
    return observable<Message>((emit) => {
      ctx.ee.on("newMessage", emit.next);
      return () => ctx.ee.off("newMessage", emit.next);
    });
  }),
});

const server = createHTTPServer({
  router: appRouter,
  middleware: cors({ origin: "*" }),
  createContext,
}).server.listen(8000);

applyWSSHandler({
  wss: new ws.Server({ server }),
  router: appRouter,
  createContext,
});

export type AppRouter = typeof appRouter;
