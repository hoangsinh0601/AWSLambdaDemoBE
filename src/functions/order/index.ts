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

export const getOrder = {
  handler: `${basePath}/get.handler`,
  events: [
    {
      httpApi: {
        path: "/orders/{id}",
        method: "get",
      },
    },
  ],
};

export const updateOrderStatus = {
  handler: `${basePath}/updateStatus.handler`,
  events: [
    {
      httpApi: {
        path: "/orders/{id}/status",
        method: "patch",
      },
    },
  ],
};
