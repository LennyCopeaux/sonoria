import { z } from "zod";

export const RegisterRole = z.enum(["USER", "ARTIST"]);

export const RegisterDto = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80),
  role: RegisterRole.optional().default("USER"),
});

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Use the input type so `role` stays optional (the Zod `.default("USER")`
// only fills it in on parse); the request DTO accepts an absent role.
export type RegisterDto = z.input<typeof RegisterDto>;
export type LoginDto = z.infer<typeof LoginDto>;
