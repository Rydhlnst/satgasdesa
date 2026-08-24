import { z } from "zod";

export const updateMyProfileSchema = z.object({
  name: z.string().trim().min(2).max(255),
  phone: z.string().trim().min(6).max(30).optional().or(z.literal("")),
  image: z.string().trim().url().max(2_000).optional().or(z.literal("")),
});
