import Router from "koa-router";
import dataStore from "nedb-promise";
import { broadcast } from "./wss.js";

export class ConfectionaryStore {
  constructor({ filename, autoload }) {
    this.store = dataStore({ filename, autoload });
  }

  async find(props) {
    return this.store.find(props);
  }

  async findOne(props) {
    return this.store.findOne(props);
  }

  async insert(confectionary) {
    if (!confectionary.name || typeof confectionary.inCluj !== "boolean") {
      throw new Error("Missing name or inCluj flag");
    }
    confectionary.date = new Date();
    return this.store.insert(confectionary);
  }

  async update(props, confectionary) {
    confectionary.date = new Date();
    if (!confectionary.name || typeof confectionary.inCluj !== "boolean") {
      throw new Error("Missing name or inCluj flag");
    }
    return this.store.update(props, { $set: confectionary });
  }

  async remove(props) {
    return this.store.remove(props);
  }
}

const confectionaryStore = new ConfectionaryStore({
  filename: "./db/confectionaries.json",
  autoload: true,
});

export const confectionaryRouter = new Router();

confectionaryRouter.get("/", async (ctx) => {
  const userId = ctx.state.user._id;
  ctx.response.body = await confectionaryStore.find({ userId });
  ctx.response.status = 200; // ok
});

confectionaryRouter.get("/:id", async (ctx) => {
  const userId = ctx.state.user._id;
  const confectionary = await confectionaryStore.findOne({
    _id: ctx.params.id,
  });
  const response = ctx.response;
  if (confectionary) {
    if (confectionary.userId === userId) {
      ctx.response.body = confectionary;
      ctx.response.status = 200; // ok
    } else {
      ctx.response.status = 403; // forbidden
    }
  } else {
    ctx.response.status = 404; // not found
  }
});

const createConfectionary = async (ctx, item, response) => {
  try {
    const userId = ctx.state.user?._id;
    item.userId = userId;
    if (!item.name || typeof item.inCluj !== "boolean") {
      throw new Error("Missing name or inCluj flag");
    }
    item.date = new Date();
    const savedItem = await confectionaryStore.insert(item);
    response.body = savedItem;
    response.status = 201;
    broadcast(userId, {
      event: "created",
      payload: { confectionary: savedItem },
    });
  } catch (err) {
    response.body = { message: err.message };
    response.status = 400;
  }
};

confectionaryRouter.post(
  "/",
  async (ctx) => await createConfectionary(ctx, ctx.request.body, ctx.response)
);

confectionaryRouter.put("/:id", async (ctx) => {
  const item = ctx.request.body;
  const id = ctx.params.id;
  const itemId = item._id;
  const response = ctx.response;
  if (itemId && itemId !== id) {
    response.body = { message: "Param id and body _id should be the same" };
    response.status = 400; // bad request
    return;
  }
  if (!itemId) {
    await createConfectionary(ctx, item, response);
  } else {
    const userId = ctx.state.user._id;
    item.userId = userId;
    const updatedCount = await confectionaryStore.update({ _id: id }, item);
    if (updatedCount === 1) {
      response.body = item;
      response.status = 200; // ok
      broadcast(userId, { event: "updated", payload: { confectionary: item } });
    } else {
      response.body = { message: "Resource no longer exists" };
      response.status = 405; // method not allowed
    }
  }
});

confectionaryRouter.del("/:id", async (ctx) => {
  const userId = ctx.state.user._id;
  const item = await confectionaryStore.findOne({ _id: ctx.params.id });
  if (item && userId !== item.userId) {
    ctx.response.status = 403; // forbidden
  } else {
    await confectionaryStore.remove({ _id: ctx.params.id });
    ctx.response.status = 204; // no content
    broadcast(userId, { event: "deleted", payload: { confectionary: item } });
  }
});
