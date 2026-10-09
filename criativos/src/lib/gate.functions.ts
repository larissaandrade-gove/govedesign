import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type GateSession = { unlocked?: boolean };

function config() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "gove-gate",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

function matches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const getGateStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<GateSession>(config());
  return { unlocked: session.data.unlocked === true };
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const email = process.env["GATE_EMAIL"];
    const password = process.env["GATE_PASSWORD"];
    if (!email || !password) throw new Error("Credenciais não configuradas");

    const ok =
      matches(data.email.trim().toLowerCase(), email.trim().toLowerCase()) &&
      matches(data.password, password);
    if (!ok) return { ok: false as const };

    const session = await useSession<GateSession>(config());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(config());
  await session.clear();
  return { ok: true as const };
});
