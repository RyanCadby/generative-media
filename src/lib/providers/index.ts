import type { GenerationProvider, ProviderName } from "./types";
import { geminiProvider } from "./gemini";
import { openaiProvider } from "./openai";
import { runwayProvider } from "./runway";
import { togetherProvider } from "./together";
import { topazProvider } from "./topaz";

const providers: Record<ProviderName, GenerationProvider> = {
  gemini: geminiProvider,
  openai: openaiProvider,
  runway: runwayProvider,
  together: togetherProvider,
  topaz: topazProvider,
};

export function getProvider(name: ProviderName): GenerationProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return provider;
}

export type { GenerationProvider, ProviderName } from "./types";
export type {
  GenerationType,
  ImageGenerationOptions,
  VideoGenerationOptions,
  ImageResult,
  VideoJobResult,
  VideoJobStatus,
} from "./types";
