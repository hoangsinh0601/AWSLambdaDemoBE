const basePath = "src/functions/order";

export const createOrder = {
  handler: `${basePath}/create.handler`,
  events: [
    {
      httpApi: {
        path: "/orders",
        method: "post",
      },
    },
  ],
};

export const listOrders = {
  handler: `${basePath}/list.handler`,
  events: [
    {
      httpApi: {
        path: "/orders",
        method: "get",
      },
    },
  ],
};
