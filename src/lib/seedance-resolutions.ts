export interface SeedanceResolution {
  width: number;
  height: number;
  label: string;
}

export interface SeedanceTier {
  id: string;
  label: string;
  resolutions: SeedanceResolution[];
}

export const SEEDANCE_TIERS: SeedanceTier[] = [
  {
    id: "SD",
    label: "SD",
    resolutions: [
      { width: 864, height: 480, label: "864x480 (16:9)" },
      { width: 736, height: 544, label: "736x544 (4:3)" },
      { width: 640, height: 640, label: "640x640 (1:1)" },
      { width: 544, height: 736, label: "544x736 (3:4)" },
      { width: 480, height: 864, label: "480x864 (9:16)" },
    ],
  },
  {
    id: "HD",
    label: "HD",
    resolutions: [
      { width: 960, height: 416, label: "960x416 (21:9)" },
      { width: 1248, height: 704, label: "1248x704 (16:9)" },
      { width: 1120, height: 832, label: "1120x832 (4:3)" },
      { width: 960, height: 960, label: "960x960 (1:1)" },
      { width: 832, height: 1120, label: "832x1120 (3:4)" },
      { width: 704, height: 1248, label: "704x1248 (9:16)" },
    ],
  },
  {
    id: "FHD",
    label: "FHD",
    resolutions: [
      { width: 1504, height: 640, label: "1504x640 (21:9)" },
      { width: 1920, height: 1088, label: "1920x1088 (16:9)" },
      { width: 1664, height: 1248, label: "1664x1248 (4:3)" },
      { width: 1440, height: 1440, label: "1440x1440 (1:1)" },
      { width: 1248, height: 1664, label: "1248x1664 (3:4)" },
      { width: 1088, height: 1920, label: "1088x1920 (9:16)" },
    ],
  },
  {
    id: "Ultra",
    label: "Ultra",
    resolutions: [
      { width: 2176, height: 928, label: "2176x928 (21:9)" },
    ],
  },
];

export const DEFAULT_SEEDANCE_TIER = "FHD";
export const DEFAULT_SEEDANCE_RESOLUTION = "1920x1088";

export function formatResolution(width: number, height: number): string {
  return `${width}x${height}`;
}

export function isSeedanceModelId(modelId: string): boolean {
  return modelId.toLowerCase().includes("seedance");
}
