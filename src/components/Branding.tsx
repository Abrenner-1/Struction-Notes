import React from "react";
import { cn } from "../lib/utils";

export function StructionLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* S Crane Shape */}
      <path
        d="M 15 15 H 85 L 75 25 H 35 V 45 H 55 L 65 55 V 85 H 15 L 25 75 H 45 V 55 H 25 L 15 45 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="miter"
      />
      {/* Crane Hook Cable */}
      <line
        x1="72"
        y1="25"
        x2="72"
        y2="65"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2 1.5"
      />
      {/* Hook Block */}
      <rect x="69" y="65" width="6" height="4" fill="currentColor" rx="0.5" />
      {/* Hook Curve */}
      <path
        d="M 72 69 v 4 a 3 3 0 0 0 6 0 v -1"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl bg-brand-navy border border-white/10",
        className,
      )}
    >
      <StructionLogoIcon className="w-full h-full text-orange-500 hover:text-orange-400 transition-colors duration-300" />
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
          <StructionLogoIcon className="w-full h-full text-orange-500 group-hover:scale-105 group-hover:text-orange-400 transition-all duration-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
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
        <StructionLogoIcon className="w-full h-full text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]" />
      </div>
      <div className="flex flex-col">
        <span className="font-black text-2xl tracking-tighter text-slate-100 leading-none drop-shadow-sm">
          STRUCTION
        </span>
        <span className="font-bold text-[10px] tracking-[0.4em] text-orange-500 leading-none mt-1 drop-shadow-sm">
          NOTES
        </span>
      </div>
    </div>
  );
}
