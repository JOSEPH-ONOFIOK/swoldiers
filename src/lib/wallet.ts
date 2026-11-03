"use client";
import { api, ApiError } from "./client";

// Wallet picker + sign-in. Wallets announce themselves (EIP-6963); older
// ones only set window.ethereum, which is used when nothing announces.

type Provider = { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
export type Wallet = { id: string; name: string; icon?: string; provider: Provider };

type Announce = CustomEvent<{ info: { uuid: string; name: string; icon: string; rdns: string }; provider: Provider }>;

export function discoverWallets(waitMs = 350): Promise<Wallet[]> {
  return new Promise((resolve) => {
    const found = new Map<string, Wallet>();
    const on = (e: Event) => {
      const { info, provider } = (e as Announce).detail;
      if (!found.has(info.rdns || info.uuid)) found.set(info.rdns || info.uuid, { id: info.rdns || info.uuid, name: info.name, icon: info.icon, provider });
    };
    window.addEventListener("eip6963:announceProvider", on);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", on);
      const legacy = (window as unknown as { ethereum?: Provider }).ethereum;
      if (!found.size && legacy) found.set("injected", { id: "injected", name: "Browser wallet", provider: legacy });
      resolve([...found.values()]);
    }, waitMs);
  });
}

const toHex = (s: string) => "0x" + [...new TextEncoder().encode(s)].map((b) => b.toString(16).padStart(2, "0")).join("");

// Full sign-in. step(text) shows progress. Returns the signed-in address.
export async function signIn(w: Wallet, step: (t: string) => void, ref?: string | null) {
  step("Open " + w.name + " and allow the connection.");
  const accounts = (await w.provider.request({ method: "eth_requestAccounts" })) as string[];
  const account = accounts?.[0];
  if (!account) throw new Error("No account was shared. Unlock your wallet and try again.");
  step("Preparing the message…");
  const ch = await api<{ id: string; message: string }>("/api/challenge", { address: account });
  step("Sign the message in " + w.name + ". It is free.");
  const signature = (await w.provider.request({ method: "personal_sign", params: [toHex(ch.message), account] })) as string;
  step("Checking the signature…");
  const r = await api<{ address: string; joined: boolean }>("/api/login", { id: ch.id, signature, ref: ref ?? undefined });
  return r;
}

export function walletError(e: unknown) {
  const err = e as { code?: number; message?: string };
  if (err?.code === 4001 || /reject|denied|cancel/i.test(err?.message || "")) return "You cancelled in the wallet. Try again when ready.";
  if (err?.code === -32002) return "Your wallet already has a request open. Open it and finish or cancel it.";
  if (e instanceof ApiError) return e.message;
  return err?.message || "Something went wrong. Try again.";
}
