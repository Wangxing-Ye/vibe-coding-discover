import Link from "next/link";

export const USE_CASE_QUICK_FILTERS = [
  "Assistant",
  "Chat",
  "Image",
  "Video",
  "Voice",
  "Audio",
  "Speech",
  "ASR",
  "TTS",
  "STT",
  "Podcast",
  "Story",
  "Marketing",
  "Finance",
  "Business",
  "Education",
  "News",
  "E-commerce",
  "Marketplace",
  "Amazon",
  "Customer",
  "Sales",
  "Consumer",
  "Sell",
  "Buy",
  "SEO",
  "GEO",
  "Social",
  "Family",
  "Movie",
  "Music",
  "Animation",
  "Health",
  "Restaurant",
  "Cafe",
  "Workflow",
  "Appointment",
  "PDF",
  "Markdown",
  "Word",
  "PPT",
  "Mindmap",
  "Sheet",
  "HTML",
  "OCR",
  "Email",
  "RSS",
  "Browser",
  "Mobile",
  "iOS",
  "Android",
  "Hardware",
  "Memory",
  "Robot",
  "GPU",
  "CPU",
  "Device",
  "USB",
  "Windows",
  "MacOS",
  "Linux",
  "Google",
  "Microsoft",
  "Enterprise",
  "SaaS",
  "AWS",
  "Redis",
  "Database",
  "Docker",
  "OpenAI",
  "Anthropic",
  "Gemini",
  "Claude",
  "Grok",
  "Llama",
  "Payment",
  "Stripe",
  "X402",
  "Crypto",
  "Binance",
  "Coinbase",
  "EVM",
  "Ethereum",
  "Solana",
  "Prediction",
  "Wallet",
  "Whatsapp",
  "Twitter",
  "Reddit",
  "Slack",
  "Gmail",
  "Calendar",
  "Telegram",
  "Discord",
  "Notion",
  "Github",
  "Gitlab",
  "Wechat",
  "Xiaohongshu",
  "Douyin",
  "QQ",
  "Tiktok",
  "Youtube",
  "Bilibili",
  "Feishu",
  "Dingtalk",
  "Hubspot",
  "Xianyu",
  "Taobao",
  "LoRA",
  "RLHF",
  "Embedding",
  "Fine-tuning",
  "Inference",
  "Eval",
  "Security",
  "Risk",
  "Compliance",
  "Privacy",
  "Sandbox",
  "Guardrail",
  "Private",
  "Copilot",
  "Remote",
  "Local",
  "SSH",
  "VPS",
] as const;

export function UseCaseQuickFilters({
  activeQuery = "",
  period,
}: {
  activeQuery?: string;
  period?: "today";
}) {
  const active = activeQuery.trim().toLowerCase();

  function hrefFor(label: string, isActive: boolean) {
    const params = new URLSearchParams();
    if (!isActive) params.set("q", label);
    if (period === "today") params.set("period", "today");
    const qs = params.toString();
    return qs ? `/use-cases?${qs}` : "/use-cases";
  }

  return (
    <div className="flex flex-wrap gap-2">
      {USE_CASE_QUICK_FILTERS.map((label) => {
        const isActive = active === label.toLowerCase();
        const href = hrefFor(label, isActive);
        return (
          <Link
            key={label}
            href={href}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border text-secondary hover:border-foreground hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
