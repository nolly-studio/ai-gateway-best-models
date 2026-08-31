"use client"

import { useId, type ReactNode } from "react"

import { resolveProviderSlug, type ProviderSlug } from "@/lib/providers"
import { cn } from "@/lib/utils"

type IconProps = {
  className?: string
}

function Svg({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-full", className)}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  )
}

function OpenAiIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        className="fill-ink"
        d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523z"
        fillRule="evenodd"
      />
    </Svg>
  )
}

function AnthropicIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        className="fill-ink"
        d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z"
        fillRule="evenodd"
      />
    </Svg>
  )
}

function DeepseekIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588z"
        fill="#4D6BFE"
      />
    </Svg>
  )
}

function GoogleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M23 12.245c0-.905-.075-1.565-.236-2.25h-10.54v4.083h6.186c-.124 1.014-.797 2.542-2.294 3.569l-.021.136 3.332 2.53.23.022C21.779 18.417 23 15.593 23 12.245z"
        fill="#4285F4"
      />
      <path
        d="M12.225 23c3.03 0 5.574-.978 7.433-2.665l-3.542-2.688c-.948.648-2.22 1.1-3.891 1.1a6.745 6.745 0 01-6.386-4.572l-.132.011-3.465 2.628-.045.124C4.043 20.531 7.835 23 12.225 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.175A6.65 6.65 0 015.463 12c0-.758.138-1.491.361-2.175l-.006-.147-3.508-2.67-.115.054A10.831 10.831 0 001 12c0 1.772.436 3.447 1.197 4.938l3.642-2.763z"
        fill="#FBBC05"
      />
      <path
        d="M12.225 5.253c2.108 0 3.529.892 4.34 1.638l3.167-3.031C17.787 2.088 15.255 1 12.225 1 7.834 1 4.043 3.469 2.197 7.062l3.63 2.763a6.77 6.77 0 016.398-4.572z"
        fill="#EB4335"
      />
    </Svg>
  )
}

function MetaIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M8.05 7.2C9.4 5.1 10.95 3.6 12.7 3.6c1.85 0 3.15 1.45 4.35 3.6 1.2-2.15 2.5-3.6 4.35-3.6 2.55 0 4.6 2.35 4.6 6.15 0 4.7-3.85 9.85-7.35 13.05-1.15 1.05-2.25 1.7-3.65 1.7s-2.5-.65-3.65-1.7C7.85 19.2 4 14.05 4 9.35c0-3.8 2.05-6.15 4.6-6.15 1.85 0 3.15 1.45 4.35 3.6C11.75 4.65 10.45 3.2 8.6 3.2c-.2 0-.4.02-.55.05C6.7 4.4 5.7 6.15 5.15 8.2c.75-.55 1.75-.9 2.9-1z"
        fill="#0082FB"
      />
    </Svg>
  )
}

function MinimaxIcon({ className }: IconProps) {
  const id = useId().replaceAll(":", "")
  return (
    <Svg className={className}>
      <defs>
        <linearGradient id={id} x1="0%" x2="100%" y1="50%" y2="50%">
          <stop offset="0%" stopColor="#E2167E" />
          <stop offset="100%" stopColor="#FE603C" />
        </linearGradient>
      </defs>
      <path
        d="M16.278 2c1.156 0 2.093.927 2.093 2.07v12.501a.74.74 0 00.744.709.74.74 0 00.743-.709V9.099a2.06 2.06 0 012.071-2.049A2.06 2.06 0 0124 9.1v6.561a.649.649 0 01-.652.645.649.649 0 01-.653-.645V9.1a.762.762 0 00-.766-.758.762.762 0 00-.766.758v7.472a2.037 2.037 0 01-2.048 2.026 2.037 2.037 0 01-2.048-2.026v-12.5a.785.785 0 00-.788-.753.785.785 0 00-.789.752l-.001 15.904A2.037 2.037 0 0113.441 22a2.037 2.037 0 01-2.048-2.026V18.04c0-.356.292-.645.652-.645.36 0 .652.289.652.645v1.934c0 .263.142.506.372.638.23.131.514.131.744 0a.734.734 0 00.372-.638V4.07c0-1.143.937-2.07 2.093-2.07zm-5.674 0c1.156 0 2.093.927 2.093 2.07v11.523a.648.648 0 01-.652.645.648.648 0 01-.652-.645V4.07a.785.785 0 00-.789-.78.785.785 0 00-.789.78v14.013a2.06 2.06 0 01-2.07 2.048 2.06 2.06 0 01-2.071-2.048V9.1a.762.762 0 00-.766-.758.762.762 0 00-.766.758v3.8a2.06 2.06 0 01-2.071 2.049A2.06 2.06 0 010 12.9v-1.378c0-.357.292-.646.652-.646.36 0 .653.29.653.646V12.9c0 .418.343.757.766.757s.766-.339.766-.757V9.099a2.06 2.06 0 012.07-2.048 2.06 2.06 0 012.071 2.048v8.984c0 .419.343.758.767.758.423 0 .766-.339.766-.758V4.07c0-1.143.937-2.07 2.093-2.07z"
        fill={`url(#${id})`}
      />
    </Svg>
  )
}

function MistralIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M3.428 3.4h3.429v3.428H3.428V3.4zm13.714 0h3.43v3.428h-3.43V3.4z"
        fill="#FFD700"
      />
      <path
        d="M3.428 6.828h6.857v3.429H3.429V6.828zm10.286 0h6.857v3.429h-6.857V6.828z"
        fill="#FFAF00"
      />
      <path d="M3.428 10.258h17.144v3.428H3.428v-3.428z" fill="#FF8205" />
      <path
        d="M3.428 13.686h3.429v3.428H3.428v-3.428zm6.858 0h3.429v3.428h-3.429v-3.428zm6.856 0h3.43v3.428h-3.43v-3.428z"
        fill="#FA500F"
      />
      <path
        d="M0 17.114h10.286v3.429H0v-3.429zm13.714 0H24v3.429H13.714v-3.429z"
        fill="#E10500"
      />
    </Svg>
  )
}

function MoonshotIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect fill="#1783FF" height="24" rx="6" width="24" />
      <path
        d="M11.065 11.199l7.257-7.2c.137-.136.06-.41-.116-.41H14.3a.164.164 0 00-.117.051l-7.82 7.756c-.122.12-.302.013-.302-.179V3.82c0-.127-.083-.23-.185-.23H3.186c-.103 0-.186.103-.186.23V19.77c0 .128.083.23.186.23h2.69c.103 0 .186-.102.186-.23v-3.25c0-.069.025-.135.069-.178l2.424-2.406a.158.158 0 01.205-.023l6.484 4.772a7.677 7.677 0 003.453 1.283c.108.012.2-.095.2-.23v-3.06c0-.117-.07-.212-.164-.227a5.028 5.028 0 01-2.027-.807l-5.613-4.064c-.117-.078-.132-.279-.028-.381z"
        fill="#fff"
      />
    </Svg>
  )
}

function NvidiaIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M10.212 8.976V7.62c.127-.01.256-.017.388-.021 3.596-.117 5.957 3.184 5.957 3.184s-2.548 3.647-5.282 3.647a3.227 3.227 0 01-1.063-.175v-4.109c1.4.174 1.681.812 2.523 2.258l1.873-1.627a4.905 4.905 0 00-3.67-1.846 6.594 6.594 0 00-.729.044m0-4.476v2.025c.13-.01.259-.019.388-.024 5.002-.174 8.261 4.226 8.261 4.226s-3.743 4.69-7.643 4.69c-.338 0-.675-.031-1.007-.092v1.25c.278.038.558.057.838.057 3.629 0 6.253-1.91 8.794-4.169.421.347 2.146 1.193 2.501 1.564-2.416 2.083-8.048 3.763-11.24 3.763-.308 0-.603-.02-.894-.048V19.5H24v-15H10.21z"
        fill="#74B71B"
      />
    </Svg>
  )
}

function StepfunIcon({ className }: IconProps) {
  const id = useId().replaceAll(":", "")
  return (
    <Svg className={className}>
      <defs>
        <linearGradient id={id} x1="1.646" x2="18.342" y1="1.916" y2="22.091">
          <stop stopColor="#01A9FF" />
          <stop offset="1" stopColor="#0160FF" />
        </linearGradient>
      </defs>
      <path
        d="M22.012 0h1.032v.927H24v.968h-.956V3.78h-1.032V1.896h-1.878v-.97h1.878V0zM2.6 12.371V1.87h.969v10.502h-.97zm10.423.66h10.95v.918h-6.208v9.579h-4.742V13.03zM5.629 3.333v12.356H0v4.51h10.386V8L20.859 8l-.003-4.668-15.227.001z"
        fill={`url(#${id})`}
        fillRule="evenodd"
      />
    </Svg>
  )
}

function AlibabaIcon({ className }: IconProps) {
  const id = useId().replaceAll(":", "")
  return (
    <Svg className={className}>
      <defs>
        <linearGradient id={id} x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#6336E7" />
          <stop offset="100%" stopColor="#6F69F7" />
        </linearGradient>
      </defs>
      <path
        d="M12.604 1.34c.393.69.784 1.382 1.174 2.075a.18.18 0 00.157.091h5.552c.174 0 .322.11.446.327l1.454 2.57c.19.337.24.478.024.837-.26.43-.513.864-.76 1.3l-.367.658c-.106.196-.223.28-.04.512l2.652 4.637c.172.301.111.494-.043.77-.437.785-.882 1.564-1.335 2.34-.159.272-.352.375-.68.37-.777-.016-1.552-.01-2.327.016a.099.099 0 00-.081.05 575.097 575.097 0 01-2.705 4.74c-.169.293-.38.363-.725.364-.997.003-2.002.004-3.017.002a.537.537 0 01-.465-.271l-1.335-2.323a.09.09 0 00-.083-.049H4.982c-.285.03-.553-.001-.805-.092l-1.603-2.77a.543.543 0 01-.002-.54l1.207-2.12a.198.198 0 000-.197 550.951 550.951 0 01-1.875-3.272l-.79-1.395c-.16-.31-.173-.496.095-.965.465-.813.927-1.625 1.387-2.436.132-.234.304-.334.584-.335a338.3 338.3 0 012.589-.001.124.124 0 00.107-.063l2.806-4.895a.488.488 0 01.422-.246c.524-.001 1.053 0 1.583-.006L11.704 1c.341-.003.724.032.9.34z"
        fill={`url(#${id})`}
      />
    </Svg>
  )
}

function ZaiIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        className="fill-ink"
        d="M12.105 2L9.927 4.953H.653L2.83 2h9.276zM23.254 19.048L21.078 22h-9.242l2.174-2.952h9.244zM24 2L9.264 22H0L14.736 2H24z"
        fillRule="evenodd"
      />
    </Svg>
  )
}

function XiaomiIcon({ className }: IconProps) {
  return (
    <span
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-[#FF6900] text-[7px] font-bold tracking-tight text-white",
        className
      )}
    >
      Mi
    </span>
  )
}

const ICONS: Record<ProviderSlug, (props: IconProps) => ReactNode> = {
  alibaba: AlibabaIcon,
  anthropic: AnthropicIcon,
  deepseek: DeepseekIcon,
  google: GoogleIcon,
  meta: MetaIcon,
  minimax: MinimaxIcon,
  mistral: MistralIcon,
  moonshotai: MoonshotIcon,
  nvidia: NvidiaIcon,
  openai: OpenAiIcon,
  stepfun: StepfunIcon,
  xiaomi: XiaomiIcon,
  zai: ZaiIcon,
}

function FallbackMark({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-field font-mono text-[8px] font-medium text-ink-2",
        className
      )}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function ProviderIcon({
  provider,
  className,
  label,
}: {
  provider: string | null
  className?: string
  label?: string
}) {
  const slug = resolveProviderSlug(provider)
  const Icon = slug == null ? null : ICONS[slug]
  const name = label ?? provider ?? "Unknown lab"

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface p-px shadow-hairline",
        className
      )}
      title={name}
    >
      {Icon == null ? <FallbackMark label={name} /> : <Icon />}
    </span>
  )
}
