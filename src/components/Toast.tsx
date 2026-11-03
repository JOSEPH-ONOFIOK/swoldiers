"use client";
import { useCallback, useRef, useState } from "react";

export function useToast() {
  const [t, setT] = useState<{ text: string; bad: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((text: string, bad = false) => {
    setT({ text, bad });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), 4500);
  }, []);
  const node = t ? (
    <div role="status" className={`toast ${t.bad ? "bad" : ""}`}>
      {t.text}
    </div>
  ) : null;
  return { show, node };
}
