"use client";
import { useEffect, useState } from "react";
import { api, type Board, type SiteState } from "./client";

// Site status and the server clock offset, so countdowns use server time.
export function useSite() {
  const [site, setSite] = useState<SiteState | null>(null);
  const [skew, setSkew] = useState(0);
  useEffect(() => {
    api<SiteState>("/api/site")
      .then((s) => {
        setSite(s);
        setSkew(s.now - Date.now());
      })
      .catch(() => {});
  }, []);
  return { site, skew };
}

export function useNow(skew: number, on = true) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!on) return;
    const tick = () => setNow(Date.now() + skew);
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [skew, on]);
  return now;
}

export function useBoard(refreshMs = 30_000) {
  const [board, setBoard] = useState<Board | null>(null);
  useEffect(() => {
    const load = () => api<Board>("/api/board").then(setBoard).catch(() => {});
    load();
    const t = setInterval(load, refreshMs);
    return () => clearInterval(t);
  }, [refreshMs]);
  return board;
}
