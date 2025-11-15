import Router from "koa-router";
import dataStore from "nedb-promise";
import { broadcast } from "./wss.js";
import multer from "koa-multer";
import path from "path";

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

// configurare storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads")); // folderul unde salvezi imaginile
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

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

/*
confectionaryRouter.post("/upload", upload.single("image"), async (ctx) => {
  console.log("ctx.file:", ctx.file);
  console.log("ctx.req.file:", ctx.req.file);

  const file = ctx.file || ctx.req.file;

  if (!file) {
    ctx.response.status = 400;
    ctx.response.body = { message: "No file uploaded" };
    return;
  }

  ctx.response.body = { imagePath: `/uploads/${file.filename}` };
  ctx.response.status = 201;
});*/

confectionaryRouter.post(
  "/upload/:id?",
  upload.single("image"),
  async (ctx) => {
    const file = ctx.file || ctx.req.file;
    if (!file) {
      ctx.response.status = 400;
      ctx.response.body = { message: "No file uploaded" };
      return;
    }

    const userId = ctx.state.user._id;
    const photoPath = `/uploads/${file.filename}`;

    if (ctx.params.id) {
      // update existing confectionary
      const id = ctx.params.id;
      const confectionary = await confectionaryStore.findOne({ _id: id });
      if (!confectionary) {
        ctx.response.status = 404;
        ctx.response.body = { message: "Confectionary not found" };
        return;
      }
      if (confectionary.userId !== userId) {
        ctx.response.status = 403;
        ctx.response.body = { message: "Forbidden" };
        return;
      }

      confectionary.photoPath = photoPath;
      await confectionaryStore.update({ _id: id }, confectionary);

      ctx.response.body = confectionary;
      ctx.response.status = 200;
      broadcast(userId, { event: "updated", payload: { confectionary } });
    } else {
      // create new confectionary with image
      const item = {
        name: ctx.request.body.name,
        inCluj:
          ctx.request.body.inCluj === "true" ||
          ctx.request.body.inCluj === true,
        userId,
        date: new Date(),
        photoPath,
      };
      const savedItem = await confectionaryStore.insert(item);

      ctx.response.body = savedItem;
      ctx.response.status = 201;
      broadcast(userId, {
        event: "created",
        payload: { confectionary: savedItem },
      });
    }
  }
);

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
