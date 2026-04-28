import { Sparkles } from "lucide-react";

export const Logo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const text = size === "lg" ? "text-4xl" : size === "sm" ? "text-lg" : "text-2xl";
  const icon = size === "lg" ? "h-8 w-8" : size === "sm" ? "h-5 w-5" : "h-6 w-6";
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-primary blur-md opacity-60" />
        <div className="relative bg-gradient-primary rounded-xl p-1.5">
          <Sparkles className={`${icon} text-white`} />
        </div>
      </div>
      <span className={`${text} font-bold text-gradient tracking-tight`} style={{ fontFamily: "Sora, Inter, sans-serif" }}>
        GMinsta
      </span>
    </div>
  );
};
