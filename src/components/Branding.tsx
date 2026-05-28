import React from "react";
import { cn } from "../lib/utils";

export function StructionLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Struction Notes structural monogram"
      className={cn("drop-shadow-xl", className)}
    >
      <rect x="5" y="5" width="90" height="90" rx="22" fill="#0B1220" />
      <path
        d="M29 30C32.8 20 41.6 15 50 15C58.4 15 67.2 20 71 30H29Z"
        fill="#EA580C"
      />
      <rect x="24" y="28" width="52" height="7" rx="3.5" fill="#FDBA74" />
      <path
        d="M45 18V30M55 18V30"
        stroke="#FDBA74"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />

      <g fill="#EA580C">
        <rect x="20" y="40" width="33" height="8" rx="4" />
        <rect x="20" y="40" width="8" height="22" rx="4" />
        <rect x="20" y="55" width="33" height="8" rx="4" />
        <rect x="45" y="55" width="8" height="22" rx="4" />
        <rect x="20" y="70" width="33" height="8" rx="4" />
      </g>

      <g stroke="#0B1220" strokeWidth="1.8" strokeLinecap="round" opacity="0.45">
        <path d="M28 44H45" />
        <path d="M28 59H45" />
        <path d="M28 74H45" />
      </g>

      <g stroke="#F8FAFC" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M61 41V77" />
        <path d="M79 41V77" />
        <path d="M61 41L79 77" />
      </g>

      <path
        d="M19 84H81"
        stroke="#334155"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <StructionLogoIcon
      className={cn("transition-transform duration-500 hover:scale-[1.03]", className)}
    />
  );
}

export function BrandName({
  className,
  variant = "horizontal",
}: {
  className?: string;
  variant?: "horizontal" | "stacked";
}) {
  if (variant === "stacked") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3",
          className,
        )}
      >
        <Logo className="w-20 h-20" />
        <div className="flex flex-col items-center">
          <span className="font-black text-3xl tracking-tighter text-slate-100 leading-none drop-shadow-md">
            STRUCTION
          </span>
          <span className="font-bold text-xs tracking-[0.4em] text-orange-500 leading-none mt-1.5 drop-shadow-sm">
            NOTES
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 group transition-all duration-300",
        className,
      )}
    >
      <Logo className="w-10 h-10 group-hover:scale-110" />
      <div className="flex flex-col">
        <span className="font-black text-2xl tracking-tighter text-slate-100 leading-none drop-shadow-sm">
          STRUCTION
          <span className="text-orange-500">.</span>
        </span>
        <span className="font-bold text-[10px] tracking-[0.4em] text-orange-500 leading-none mt-1 drop-shadow-sm">
          NOTES
        </span>
      </div>
    </div>
  );
}
