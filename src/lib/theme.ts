import type { CSSProperties } from "react";
import type { ColorVision, Prefs, ThemeId } from "../types";
import { ensureButtonContrast } from "./color";

const THEMES: Record<ThemeId, string> = {
  ocbc: "#E30613",
  ocean: "#0B6E99",
  forest: "#0F6B3C",
  sunset: "#C2410C",
  plum: "#6D28D9",
};

type Palette = {
  primary: string;
  onPrimary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  focus: string;
  hero: string;
};

function visionPalette(mode: ColorVision): Pick<
  Palette,
  "primary" | "success" | "warning" | "danger" | "info"
> {
  if (mode === "protanopia") {
    return {
      primary: "#0057B8",
      success: "#0057B8",
      warning: "#8A5A00",
      danger: "#C65D00",
      info: "#332288",
    };
  }
  if (mode === "deuteranopia") {
    return {
      primary: "#004E9A",
      success: "#004E9A",
      warning: "#8A5A00",
      danger: "#D97706",
      info: "#332288",
    };
  }
  if (mode === "tritanopia") {
    return {
      primary: "#B00020",
      success: "#5C2D91",
      warning: "#6B2D5B",
      danger: "#B00020",
      info: "#3B0764",
    };
  }
  if (mode === "monochrome") {
    return {
      primary: "#1a1a1a",
      success: "#1a1a1a",
      warning: "#1a1a1a",
      danger: "#1a1a1a",
      info: "#1a1a1a",
    };
  }
  return {
    primary: "#E30613",
    success: "#0D6B3A",
    warning: "#8A5A00",
    danger: "#B00020",
    info: "#0B4F8A",
  };
}

export function buildPalette(prefs: Prefs): Palette & { accentAdjusted: boolean } {
  const vision = visionPalette(prefs.colorVision);
  let primary = vision.primary;
  let accentAdjusted = false;
  if (prefs.colorVision === "default") {
    const chosen = prefs.customAccent || THEMES[prefs.themeId];
    const safe = ensureButtonContrast(chosen);
    primary = safe.bg;
    accentAdjusted = safe.adjusted;
  } else {
    const safe = ensureButtonContrast(primary);
    primary = safe.bg;
  }

  const dark = prefs.mode === "dark";
  const hc = prefs.highContrast;
  const bg = hc ? (dark ? "#000000" : "#ffffff") : dark ? "#121212" : "#f3f4f6";
  const surface = hc ? (dark ? "#000000" : "#ffffff") : dark ? "#1c1c1c" : "#ffffff";
  const text = dark || (hc && dark) ? "#ffffff" : "#1a1a1a";
  const muted = hc ? text : dark ? "#d0d0d0" : "#3f3f46";
  const border = hc ? (dark ? "#ffffff" : "#000000") : dark ? "#3f3f46" : "#e4e4e7";

  return {
    primary,
    onPrimary: "#ffffff",
    success: vision.success,
    warning: vision.warning,
    danger: vision.danger,
    info: vision.info,
    bg,
    surface,
    text,
    muted,
    border,
    focus: hc ? (dark ? "#ffd000" : "#000000") : dark ? "#ffffff" : "#1a1a1a",
    hero: primary,
    accentAdjusted,
  };
}

export function paletteStyle(prefs: Prefs): CSSProperties {
  const p = buildPalette(prefs);
  return {
    "--color-primary": p.primary,
    "--color-on-primary": p.onPrimary,
    "--color-success": p.success,
    "--color-warning": p.warning,
    "--color-danger": p.danger,
    "--color-info": p.info,
    "--color-bg": p.bg,
    "--color-surface": p.surface,
    "--color-text": p.text,
    "--color-muted": p.muted,
    "--color-border": p.border,
    "--color-focus": p.focus,
    "--color-hero": p.hero,
  } as CSSProperties;
}

export { THEMES };
