import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email("Invalid email address");

export type ValidatedEmail = z.infer<typeof emailSchema>;

export function parseSubscriberEmail(raw: unknown) {
  const normalized = emailSchema.parse(raw).toLowerCase();
  return normalized;
}
