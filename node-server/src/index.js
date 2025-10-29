const Koa = require("koa");
const app = new Koa();
const server = require("http").createServer(app.callback());
const WebSocket = require("ws");
const wss = new WebSocket.Server({ server });
const Router = require("koa-router");
const cors = require("@koa/cors");
const bodyparser = require("koa-bodyparser");

app.use(bodyparser());
app.use(cors());

app.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.log(`${ctx.method} ${ctx.url} ${ctx.response.status} - ${ms}ms`);
});

app.use(async (ctx, next) => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await next();
});

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.response.body = { message: err.message || "Unexpected error" };
    ctx.response.status = 500;
  }
});

class Confectionary {
  constructor({ id, name, date, inCluj, rating }) {
    this.id = id;
    this.name = name;
    this.date = date;
    this.inCluj = inCluj;
    this.rating = rating;
  }
}

const confectionaries = [];
for (let i = 0; i < 3; i++) {
  confectionaries.push(
    new Confectionary({
      id: `${i}`,
      name: `Confectionary ${i}`,
      date: new Date(Date.now() + i),
      inCluj: i % 2 === 0,
      rating: 5,
    })
  );
}

let lastUpdated = confectionaries[confectionaries.length - 1].date;
let lastId = confectionaries[confectionaries.length - 1].id;

const broadcast = (data) =>
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });

const router = new Router();

router.get("/confectionary", (ctx) => {
  ctx.response.body = confectionaries;
  ctx.response.status = 200;
});

router.get("/confectionary/:id", (ctx) => {
  const id = ctx.params.id;
  const item = confectionaries.find((c) => c.id === id);
  if (item) {
    ctx.response.body = item;
    ctx.response.status = 200;
  } else {
    ctx.response.body = { message: `Confectionary with id ${id} not found` };
    ctx.response.status = 404;
  }
});

const createConfectionary = async (ctx) => {
  const data = ctx.request.body;
  if (!data.name || typeof data.inCluj !== "boolean") {
    ctx.response.body = { message: "Missing name or inCluj flag" };
    ctx.response.status = 400;
    return;
  }

  if (data.rating < 0 || data.rating > 5) {
    ctx.response.body = { message: "Rating need to be between 0 and 5" };
    ctx.response.status = 400;
    return;
  }
  const id = `${parseInt(lastId) + 1}`;
  lastId = id;
  const item = new Confectionary({
    id,
    name: data.name,
    date: new Date(),
    inCluj: data.inCluj,
    rating: data.rating,
  });
  confectionaries.push(item);
  ctx.response.body = item;
  ctx.response.status = 201;
  broadcast({ event: "created", payload: { confectionary: item } });
};

router.post("/confectionary", async (ctx) => {
  await createConfectionary(ctx);
});

router.put("/confectionary/:id", async (ctx) => {
  const id = ctx.params.id;
  const data = ctx.request.body;
  data.date = new Date();

  if (data.id && data.id !== id) {
    ctx.response.body = { message: "Param id and body id should be the same" };
    ctx.response.status = 400;
    return;
  }

  if (data.rating < 0 || data.rating > 5) {
    ctx.response.body = { message: "Rating need to be between 0 and 5" };
    ctx.response.status = 400;
    return;
  }

  if (!data.id) {
    await createConfectionary(ctx);
    return;
  }

  const index = confectionaries.findIndex((c) => c.id === id);
  if (index === -1) {
    ctx.response.body = { message: `Confectionary with id ${id} not found` };
    ctx.response.status = 400;
    return;
  }

  const updated = new Confectionary({
    id,
    name: data.name,
    date: new Date(),
    inCluj: data.inCluj,
    rating: data.rating,
  });

  confectionaries[index] = updated;
  lastUpdated = updated.date;
  ctx.response.body = updated;
  ctx.response.status = 200;
  broadcast({ event: "updated", payload: { confectionary: updated } });
});

router.del("/confectionary/:id", (ctx) => {
  const id = ctx.params.id;
  const index = confectionaries.findIndex((c) => c.id === id);
  if (index !== -1) {
    const item = confectionaries[index];
    confectionaries.splice(index, 1);
    lastUpdated = new Date();
    broadcast({ event: "deleted", payload: { confectionary: item } });
  }
  ctx.response.status = 204;
});

/*
setInterval(() => {
  lastUpdated = new Date();
  lastId = `${parseInt(lastId) + 1}`;
  const item = new Confectionary({
    id: lastId,
    name: `Confectionary ${lastId}`,
    date: lastUpdated,
    inCluj: Math.random() < 0.5,
    rating: 5,
  });
  confectionaries.push(item);
  console.log(`New confectionary: ${item.name}`);
  broadcast({ event: "created", payload: { confectionary: item } });
}, 5000);*/

app.use(router.routes());
app.use(router.allowedMethods());

server.listen(3000);
