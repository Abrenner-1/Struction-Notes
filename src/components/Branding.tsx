import React from "react";
import { cn } from "../lib/utils";

export function StructionLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Struction Notes shield document mark"
      className={cn("drop-shadow-xl", className)}
    >
      <rect
        x="4"
        y="4"
        width="92"
        height="92"
        rx="22"
        fill="#0F172A"
      />
      <rect
        x="7"
        y="7"
        width="86"
        height="86"
        rx="19"
        stroke="#FFFFFF"
        strokeOpacity="0.1"
        strokeWidth="2"
      />
      <path
        d="M50 12L78 23V43C78 63.5 66.7 78 50 88C33.3 78 22 63.5 22 43V23L50 12Z"
        fill="#EA580C"
      />
      <path
        d="M50 18L72 26.8V43.2C72 59.4 63.5 71.3 50 80.1C36.5 71.3 28 59.4 28 43.2V26.8L50 18Z"
        stroke="#FDBA74"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M37 27H58L67 36V66C67 69.3 64.3 72 61 72H37C33.7 72 31 69.3 31 66V33C31 29.7 33.7 27 37 27Z"
        fill="#F8FAFC"
      />
      <path d="M58 27V36H67" fill="#CBD5E1" />
      <path
        d="M58 27V34C58 35.1 58.9 36 60 36H67"
        stroke="#94A3B8"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M58.5 41H43.5C39.9 41 37.5 43.2 37.5 46C37.5 49 40 51 43.5 51H54.5C58.4 51 61 53.2 61 56.2C61 59.4 58.4 62 54.3 62H39.5"
        stroke="#0F172A"
        strokeWidth="5.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M39 40H60M37 50H63M39 61H58"
        stroke="#EA580C"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M38 75H62"
        stroke="#FDBA74"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-1 border border-white/10 shadow-lg group",
        className,
      )}
    >
      <StructionLogoIcon className="w-full h-full transition-transform duration-500 group-hover:scale-[1.03]" />
    </div>
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
        <div className="w-20 h-20 group">
          <StructionLogoIcon className="w-full h-full group-hover:scale-105 transition-all duration-500" />
        </div>
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
      <div className="w-10 h-10 group-hover:scale-110 transition-transform duration-500">
        <StructionLogoIcon className="w-full h-full" />
      </div>
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
