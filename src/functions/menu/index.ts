const basePath = "src/functions/menu";

export const listMenu = {
  handler: `${basePath}/list.handler`,
  events: [
    {
      httpApi: {
        path: "/menu",
        method: "get",
      },
    },
  ],
};

export const seedMenu = {
  handler: `${basePath}/seed.handler`,
  events: [
    {
      httpApi: {
        path: "/menu/seed",
        method: "post",
      },
    },
  ],
};
