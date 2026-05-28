import React from "react";
import { cn } from "../lib/utils";

export function StructionLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Struction Notes shield mark"
      className={cn("drop-shadow-xl", className)}
    >
      <rect x="5" y="5" width="90" height="90" rx="22" fill="#0B1220" />
      <path
        d="M50 14L78 25V43.5C78 63.8 66.3 78.4 50 87.5C33.7 78.4 22 63.8 22 43.5V25L50 14Z"
        fill="#EA580C"
      />
      <path
        d="M50 21L71 29.3V43.8C71 59.4 62.8 70.8 50 78.8C37.2 70.8 29 59.4 29 43.8V29.3L50 21Z"
        fill="#111827"
      />
      <path
        d="M39 31H56.5L64 38.5V65C64 68.3 61.3 71 58 71H39C35.7 71 33 68.3 33 65V37C33 33.7 35.7 31 39 31Z"
        fill="#F8FAFC"
      />
      <path d="M56.5 31V38.5H64" fill="#CBD5E1" />
      <path
        d="M56.5 31V36.5C56.5 37.6 57.4 38.5 58.5 38.5H64"
        stroke="#94A3B8"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M57 45H43.5C40.8 45 39 46.7 39 49C39 51.3 40.8 53 43.5 53H54.5C57.6 53 60 55 60 58C60 61 57.6 63 54.5 63H40.5"
        stroke="#0B1220"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M39 76H61"
        stroke="#FDBA74"
        strokeWidth="4"
        strokeLinecap="round"
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
