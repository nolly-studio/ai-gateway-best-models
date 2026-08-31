"use client";

import {
  Anthropic,
  DeepSeek,
  Google,
  Meta,
  Minimax,
  Mistral,
  Moonshot,
  Nvidia,
  OpenAI,
  Qwen,
  Stepfun,
  XiaomiMiMo,
  ZAI,
  type IconType,
} from "@lobehub/icons";

import { resolveProviderSlug, type ProviderSlug } from "@/lib/providers";
import { cn } from "@/lib/utils";

const ICONS: Record<ProviderSlug, IconType> = {
  alibaba: Qwen.Color,
  anthropic: Anthropic,
  deepseek: DeepSeek.Color,
  google: Google.Color,
  meta: Meta.Color,
  minimax: Minimax.Color,
  mistral: Mistral.Color,
  moonshotai: Moonshot,
  nvidia: Nvidia.Color,
  openai: OpenAI,
  stepfun: Stepfun,
  xiaomi: XiaomiMiMo,
  zai: ZAI,
};

function FallbackMark({ label }: { label: string }) {
  return (
    <span className="flex size-full items-center justify-center rounded-full bg-field font-mono text-[8px] font-medium text-ink-2">
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function ProviderIcon({
  provider,
  className,
  label,
}: {
  provider: string | null;
  className?: string;
  label?: string;
}) {
  const slug = resolveProviderSlug(provider);
  const Icon = slug == null ? null : ICONS[slug];
  const name = label ?? provider ?? "Unknown lab";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-ink shadow-hairline",
        className,
      )}
      title={name}
    >
      {Icon == null ? <FallbackMark label={name} /> : <Icon size="100%" />}
    </span>
  );
}
