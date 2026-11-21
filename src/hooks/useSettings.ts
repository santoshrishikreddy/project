"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lang } from "@/lib/types";

export type Theme = "light" | "dark" | "neutral";

export interface Settings {
  lang: Lang;
  theme: Theme;
  /** Root font size in percent: every size in the app scales with it. */
  fontScale: number;
  /** Colour saturation in percent (0 = greyscale, 100 = normal, 200 = vivid). */
  saturation: number;
  rate: number;
  pitch: number;
  autoListen: boolean;
  voiceNames: Partial<Record<Lang, string>>;
}

export const FONT_STEPS = [80, 90, 100, 115, 130, 150, 175];

export const DEFAULT_SETTINGS: Settings = {
  lang: "en",
  theme: "light",
  fontScale: 100,
  saturation: 100,
  rate: 0.95,
  pitch: 1.1,
  autoListen: true,
  voiceNames: {},
};

const KEY = "sakhi-settings";

function apply(s: Settings) {
  const d = document.documentElement;
  d.setAttribute("data-theme", s.theme);
  d.style.fontSize = `${s.fontScale}%`;
  d.style.filter = s.saturation === 100 ? "" : `saturate(${s.saturation}%)`;
  d.lang = s.lang;
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
      const theme = (parsed.theme ?? document.documentElement.getAttribute("data-theme") ?? "light") as Theme;
      setS({ ...DEFAULT_SETTINGS, ...parsed, theme });
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    apply(s);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage full / private mode */
    }
  }, [s, ready]);

  const update = useCallback((patch: Partial<Settings>) => setS((prev) => ({ ...prev, ...patch })), []);
  return [s, update];
}
