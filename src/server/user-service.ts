/**
 * User service — account creation for the Credentials (email/password) flow.
 * OAuth accounts are created by the Prisma adapter; this covers the rest.
 */
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const registerSchema = z.object({
  name: z.string().min(1, "Enter your name").max(80),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export class RegistrationError extends Error {}

export async function registerUser(input: RegisterInput) {
  const data = registerSchema.parse(input);
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new RegistrationError("An account with that email already exists.");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name: data.name,
      hashedPassword,
      profile: {
        create: { displayName: data.name },
      },
    },
    select: { id: true, email: true, name: true },
  });

  return user;
}
