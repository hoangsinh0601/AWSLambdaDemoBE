export const createOrderSchema = {
  type: "object",
  required: ["items"],
  properties: {
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["name", "quantity"],
        properties: {
          name: { type: "string" },
          quantity: { type: "number", minimum: 1 },
        },
      },
    },
  },
} as const;
