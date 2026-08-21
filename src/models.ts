export const models = {
  Grok46: "grok-4.6",
} as const;

export type NamedModel = (typeof models)[keyof typeof models];
