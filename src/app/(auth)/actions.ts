"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { registerUser, registerSchema, RegistrationError } from "@/server/user-service";

export type AuthActionState = { error?: string } | undefined;

/** Sign in with email + password. Redirects on success. */
export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Wrong email or password." };
    }
    throw err; // re-throw the Next.js redirect
  }
}

/** Create an account, then sign the new user straight in. */
export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  try {
    await registerUser(parsed.data);
  } catch (err) {
    if (err instanceof RegistrationError) return { error: err.message };
    return { error: "Could not create your account. Try again." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Account created — please sign in." };
    throw err;
  }
}

/** Google OAuth entry point (used by the "Continue with Google" buttons). */
export async function googleSignInAction(callbackUrl?: string) {
  await signIn("google", { redirectTo: callbackUrl ?? "/dashboard" });
}
