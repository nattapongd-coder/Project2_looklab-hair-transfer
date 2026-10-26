import { Hairstyle } from "../types";
import { HAIR_LAYOUT_CONFIGS, normalizeKey } from "../data";

export const CONFIG_STORAGE_KEY = "hfar_saved_hairstyle_layouts_v3";

export const getSavedLayoutsMap = (): Record<string, Partial<Hairstyle>> => {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

export const getLayoutFromMap = (
  map: Record<string, any> | undefined | null,
  style: Hairstyle
) => {
  if (!map) return null;
  const englishInParen = style.name.match(/\(([^)]+)\)/)?.[1] || "";
  const candidates = [
    style.id,
    style.englishName,
    englishInParen,
    style.name,
    style.name.split(" (")[0],
  ];

  for (const cand of candidates) {
    if (!cand) continue;
    const norm = normalizeKey(cand);
    for (const [k, v] of Object.entries(map)) {
      if (normalizeKey(k) === norm) {
        return v;
      }
    }
  }
  return null;
};

export const applySavedLayouts = (
  styles: Hairstyle[],
  backendOverrides?: Record<string, any>
): Hairstyle[] => {
  return styles.map((style) => {
    const backendConfig = getLayoutFromMap(backendOverrides, style);
    const lockedConfig = backendConfig || getLayoutFromMap(HAIR_LAYOUT_CONFIGS, style);

    if (lockedConfig) {
      return {
        ...style,
        scaleX: typeof lockedConfig.scaleX === "number" ? lockedConfig.scaleX : style.scaleX,
        scaleY: typeof lockedConfig.scaleY === "number" ? lockedConfig.scaleY : style.scaleY,
        offsetX: typeof lockedConfig.offsetX === "number" ? lockedConfig.offsetX : style.offsetX,
        offsetY: typeof lockedConfig.offsetY === "number" ? lockedConfig.offsetY : style.offsetY,
        isFlipped: typeof lockedConfig.isFlipped === "boolean" ? lockedConfig.isFlipped : style.isFlipped,
      };
    }
    return style;
  });
};

export const saveHairstyleLayout = async (updatedStyle: Hairstyle) => {
  try {
    const currentMap = getSavedLayoutsMap();
    currentMap[updatedStyle.id] = {
      scaleX: updatedStyle.scaleX,
      scaleY: updatedStyle.scaleY,
      offsetX: updatedStyle.offsetX,
      offsetY: updatedStyle.offsetY,
      isFlipped: updatedStyle.isFlipped,
      enableFaceMask: updatedStyle.enableFaceMask,
    };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(currentMap));
  } catch (e) {}

  try {
    const nameKey = updatedStyle.name.split(" (")[0].toLowerCase().trim();
    await fetch("/api/config/layouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [nameKey]: {
          scaleX: updatedStyle.scaleX,
          scaleY: updatedStyle.scaleY,
          offsetX: updatedStyle.offsetX,
          offsetY: updatedStyle.offsetY,
          isFlipped: updatedStyle.isFlipped,
          enableFaceMask: updatedStyle.enableFaceMask,
        },
      }),
    });
  } catch (e) {
    console.warn("Failed to persist layout configuration to backend API:", e);
  }
};
