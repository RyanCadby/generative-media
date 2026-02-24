import { ExternalLink, Key, BookOpen, Image, Video, ArrowUpRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  IMAGE_TO_VIDEO_MODELS,
  UPSCALE_MODELS,
} from "@/lib/models";
import type { ModelDefinition } from "@/lib/models";

const providers = [
  {
    id: "gemini" as const,
    name: "Google Gemini",
    description: "Image generation with Imagen and video generation with Veo models.",
    docsUrl: "https://ai.google.dev/gemini-api/docs",
    apiKeysUrl: "https://aistudio.google.com/apikey",
    envVar: "GOOGLE_GENAI_API_KEY",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    dotColor: "bg-blue-500",
  },
  {
    id: "openai" as const,
    name: "OpenAI",
    description: "GPT Image generation and Sora video generation.",
    docsUrl: "https://platform.openai.com/docs/guides/images",
    apiKeysUrl: "https://platform.openai.com/api-keys",
    envVar: "OPENAI_API_KEY",
    color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    dotColor: "bg-green-500",
  },
  {
    id: "runway" as const,
    name: "Runway",
    description: "Gen-4 image generation and image-to-video capabilities.",
    docsUrl: "https://docs.dev.runwayml.com",
    apiKeysUrl: "https://app.runwayml.com/settings",
    envVar: "RUNWAYML_API_SECRET",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
    dotColor: "bg-purple-500",
  },
  {
    id: "together" as const,
    name: "Together AI",
    description: "Video generation via Seedance, Wan, and Kling models.",
    docsUrl: "https://docs.together.ai/docs/video-overview",
    apiKeysUrl: "https://api.together.ai/settings/api-keys",
    envVar: "TOGETHER_API_KEY",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
    dotColor: "bg-orange-500",
  },
  {
    id: "topaz" as const,
    name: "Topaz Labs",
    description: "AI-powered image upscaling with multiple enhancement models.",
    docsUrl: "https://docs.topazlabs.com/topaz-photo-ai/autopilot-api",
    apiKeysUrl: "https://www.topazlabs.com/account",
    envVar: "TOPAZ_API_KEY",
    color: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
    dotColor: "bg-teal-500",
  },
];

function getModelsForProvider(providerId: string): ModelDefinition[] {
  const seen = new Set<string>();
  const models: ModelDefinition[] = [];

  for (const m of [...IMAGE_MODELS, ...VIDEO_MODELS, ...IMAGE_TO_VIDEO_MODELS, ...UPSCALE_MODELS]) {
    if (m.provider === providerId && !seen.has(m.id)) {
      seen.add(m.id);
      models.push(m);
    }
  }

  return models;
}

function getCapabilities(providerId: string): string[] {
  const caps: string[] = [];
  if (IMAGE_MODELS.some((m) => m.provider === providerId)) caps.push("Text to Image");
  if (VIDEO_MODELS.some((m) => m.provider === providerId)) caps.push("Text to Video");
  if (IMAGE_TO_VIDEO_MODELS.some((m) => m.provider === providerId && !VIDEO_MODELS.some((v) => v.id === m.id))) {
    caps.push("Image to Video");
  } else if (VIDEO_MODELS.some((m) => m.provider === providerId)) {
    caps.push("Image to Video");
  }
  if (UPSCALE_MODELS.some((m) => m.provider === providerId)) caps.push("Image Upscale");
  return caps;
}

const generationTypeIcons: Record<string, React.ReactNode> = {
  "text-to-image": <Image className="h-3.5 w-3.5" />,
  "text-to-video": <Video className="h-3.5 w-3.5" />,
  "image-to-video": <Video className="h-3.5 w-3.5" />,
  "image-upscale": <Sparkles className="h-3.5 w-3.5" />,
};

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Providers, models, and API configuration for your generative media pipeline.
          </p>
        </div>

        {/* Providers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Providers</h2>
            <span className="text-xs text-muted-foreground">{providers.length} configured</span>
          </div>

          <div className="space-y-3">
            {providers.map((provider) => {
              const models = getModelsForProvider(provider.id);
              const capabilities = getCapabilities(provider.id);

              return (
                <div
                  key={provider.id}
                  className="border rounded-lg bg-card"
                >
                  {/* Provider header */}
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-2 w-2 rounded-full ${provider.dotColor}`} />
                        <h3 className="text-sm font-semibold">{provider.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 ml-[18px]">
                        {provider.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2.5 ml-[18px]">
                        {capabilities.map((cap) => (
                          <Badge
                            key={cap}
                            variant="secondary"
                            className="text-[11px] font-medium px-2 py-0"
                          >
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-muted"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Docs
                      </a>
                      <a
                        href={provider.apiKeysUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-muted"
                      >
                        <Key className="h-3.5 w-3.5" />
                        API Keys
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {/* Environment variable */}
                  <div className="px-5 py-2.5 border-t bg-muted/30">
                    <div className="flex items-center gap-2 ml-[18px]">
                      <span className="text-[11px] text-muted-foreground">ENV</span>
                      <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {provider.envVar}
                      </code>
                    </div>
                  </div>

                  {/* Models table */}
                  <div className="border-t">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-2 pl-[38px]">
                            Model
                          </th>
                          <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
                            Type
                          </th>
                          <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
                            Description
                          </th>
                          <th className="text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-2">
                            ID
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {models.map((model, i) => (
                          <tr
                            key={model.id}
                            className={i < models.length - 1 ? "border-b border-border/50" : ""}
                          >
                            <td className="px-5 py-2.5 pl-[38px]">
                              <span className="text-sm font-medium">{model.name}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                {generationTypeIcons[model.generationType]}
                                {model.generationType === "text-to-image" && "Image"}
                                {model.generationType === "text-to-video" && "Video"}
                                {model.generationType === "image-to-video" && "I2V"}
                                {model.generationType === "image-upscale" && "Upscale"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs text-muted-foreground">{model.description}</span>
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <code className="text-[11px] font-mono text-muted-foreground">
                                {model.id}
                              </code>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Configuration section */}
        <div className="mt-10 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Configuration</h2>
          <div className="border rounded-lg bg-card overflow-hidden">
            <div className="px-5 py-4">
              <h3 className="text-sm font-semibold">Environment Variables</h3>
              <p className="text-sm text-muted-foreground mt-1">
                API keys are stored in <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">.env.local</code> and
                never exposed to the client.
              </p>
            </div>
            <div className="border-t">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-2">
                      Variable
                    </th>
                    <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
                      Provider
                    </th>
                    <th className="text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-2">
                      Manage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((provider, i) => (
                    <tr
                      key={provider.id}
                      className={i < providers.length - 1 ? "border-b border-border/50" : ""}
                    >
                      <td className="px-5 py-2.5">
                        <code className="text-xs font-mono">{provider.envVar}</code>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-sm text-muted-foreground">{provider.name}</span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <a
                          href={provider.apiKeysUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Dashboard</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
