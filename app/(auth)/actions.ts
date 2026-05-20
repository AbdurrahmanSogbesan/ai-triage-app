"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MOCK_COOKIE, roleFromEmail, roleRoot } from "@/lib/auth/mock";
import type { Role } from "@/lib/types";

async function setMockRole(role: Role) {
  const store = await cookies();
  store.set({
    name: MOCK_COOKIE,
    value: role,
    httpOnly: false,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function mockLogin(email: string) {
  const role = roleFromEmail(email);
  await setMockRole(role);
  redirect(roleRoot(role));
}

export async function mockRegister() {
  await setMockRole("patient");
  redirect(roleRoot("patient"));
}
