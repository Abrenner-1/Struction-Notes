import React from "react";
import { cn } from "../lib/utils";

export function StructionLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("drop-shadow-xl", className)}
    >
      <defs>
        {/* Premium multi-stop Safety Orange Gradient */}
        <linearGradient id="safetyOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDBA74" /> {/* amber-300 shine */}
          <stop offset="25%" stopColor="#FB923C" /> {/* orange-400 */}
          <stop offset="75%" stopColor="#EA580C" /> {/* orange-600 */}
          <stop offset="100%" stopColor="#9A3412" /> {/* orange-900 shadow */}
        </linearGradient>

        {/* Steel Metallic Slate Gradient for dark structure */}
        <linearGradient id="solidSteelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#475569" /> {/* slate-600 */}
          <stop offset="40%" stopColor="#1E293B" /> {/* slate-800 */}
          <stop offset="100%" stopColor="#0F172A" /> {/* slate-900 */}
        </linearGradient>

        {/* Polished Shiny White/Gold for checkmark body */}
        <linearGradient id="luminousGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" /> {/* yellow-300 */}
          <stop offset="100%" stopColor="#EA580C" /> {/* orange-600 */}
        </linearGradient>

        <linearGradient id="steelSilver" x1="0%" y1="0%" x2="120%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>

        {/* Shadow filters for 3D depth styling */}
        <filter id="girderShadow" x="-10%" y="-10%" width="125%" height="125%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="2" floodColor="#020617" floodOpacity="0.5" />
        </filter>

        <filter id="payloadGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* 1. STRUCTURAL SAFETY-ORANGE PLATE (Rounded Square Chassis) */}
      <rect
        x="3"
        y="3"
        width="94"
        height="94"
        rx="22"
        fill="url(#safetyOrangeGrad)"
        stroke="#0F172A"
        strokeWidth="4"
      />

      {/* 2. ARCHITECTURAL LAYOUT & ALIGNMENT GRID (Subtle backdrop mapping) */}
      <g stroke="#FFFFFF" strokeWidth="0.6" opacity="0.18">
        {/* Concentric layout circles */}
        <circle cx="50" cy="50" r="42" strokeDasharray="2 3" />
        <circle cx="50" cy="50" r="28" />
        <circle cx="50" cy="50" r="14" strokeDasharray="1 3" />
        
        {/* Alignment axis guide lines */}
        <line x1="8" y1="50" x2="92" y2="50" />
        <line x1="50" y1="8" x2="50" y2="92" />
        
        {/* Corner alignment crosshairs */}
        <line x1="16" y1="16" x2="30" y2="16" />
        <line x1="16" y1="16" x2="16" y2="30" />
        <line x1="84" y1="16" x2="70" y2="16" />
        <line x1="84" y1="16" x2="84" y2="30" />
        <line x1="16" y1="84" x2="30" y2="84" />
        <line x1="16" y1="84" x2="16" y2="70" />
        <line x1="84" y1="84" x2="70" y2="84" />
        <line x1="84" y1="84" x2="84" y2="70" />
      </g>

      {/* Industrial corner rivets (Heavy machine fixture details) */}
      <circle cx="9" cy="9" r="2.2" fill="#0F172A" opacity="0.7" />
      <circle cx="91" cy="9" r="2.2" fill="#0F172A" opacity="0.7" />
      <circle cx="9" cy="91" r="2.2" fill="#0F172A" opacity="0.7" />
      <circle cx="91" cy="91" r="2.2" fill="#0F172A" opacity="0.7" />

      {/* Rivet metal shine pin points */}
      <circle cx="8" cy="8" r="0.6" fill="#FFFFFF" opacity="0.4" />
      <circle cx="90" cy="8" r="0.6" fill="#FFFFFF" opacity="0.4" />

      {/* 3. THE "S" SHAPED CRANE TOWER ASSEMBLY */}
      {/* 5 modular crane steel girders overlap with solid joins to form a seamless block "S". */}
      <g filter="url(#girderShadow)">
        {/* Top Jib arm (Horizontal) */}
        <rect x="32" y="22" width="43" height="8" rx="2" fill="url(#solidSteelGrad)" stroke="#0F172A" strokeWidth="1.8" />
        
        {/* Upper support Mast (Vertical Left) */}
        <rect x="32" y="28" width="8" height="22" rx="2" fill="url(#solidSteelGrad)" stroke="#0F172A" strokeWidth="1.8" />
        
        {/* Middle structural deck (Horizontal) */}
        <rect x="32" y="46" width="38" height="8" rx="2" fill="url(#solidSteelGrad)" stroke="#0F172A" strokeWidth="1.8" />
        
        {/* Lower support Mast (Vertical Right) */}
        <rect x="62" y="50" width="8" height="22" rx="2" fill="url(#solidSteelGrad)" stroke="#0F172A" strokeWidth="1.8" />
        
        {/* Crawler Tracks / Ground Base (Horizontal Bottom) */}
        <rect x="22" y="68" width="48" height="8" rx="2" fill="url(#solidSteelGrad)" stroke="#0F172A" strokeWidth="1.8" strokeLinejoin="round" />
      </g>

      {/* 4. FINE LATTICE STRUCTURAL TRUSS WEBBING inside each girder segment */}
      <g stroke="#FB923C" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
        {/* Top Jib truss triangles */}
        <path d="M 40,22 L 44,30 L 48,22 L 52,30 L 56,22 L 60,30 L 64,22 L 68,30 L 72,22" />

        {/* Upper Mast truss triangles */}
        <path d="M 32,32 L 40,36 L 32,40 L 40,44 L 32,48" />

        {/* Middle Deck truss triangles */}
        <path d="M 40,54 L 44,46 L 48,54 L 52,46 L 56,54 L 60,46" />

        {/* Lower Mast truss triangles */}
        <path d="M 70,52 L 62,56 L 70,60 L 62,64 L 70,68" />

        {/* Bottom Base truss triangles */}
        <path d="M 24,76 L 28,68 L 32,76 L 36,68 L 40,76 L 44,68 L 48,76 L 52,68 L 56,76 L 60,68" />
      </g>

      {/* Tiny hinges and rivet joints at structural junctions */}
      <circle cx="36" cy="26" r="1.5" fill="#FFFFFF" opacity="0.3" />
      <circle cx="66" cy="72" r="1.5" fill="#FFFFFF" opacity="0.3" />

      {/* 5. TROLLEY AND SUSPENDED HOIST CABLES */}
      <g stroke="#0F172A" strokeWidth="1.5">
        {/* Crane trolley carriage sliding on the Jib */}
        <rect x="71" y="24" width="6" height="4" rx="1" fill="#EA580C" stroke="#0F172A" strokeWidth="1" />
        
        {/* High-tension hoist cable hanging down from trolley */}
        <line x1="74" y1="28" x2="74" y2="43" stroke="#0F172A" strokeWidth="1.5" />
      </g>

      {/* Block sheave block holding the load hook */}
      <circle cx="74" cy="44.5" r="3" fill="url(#steelSilver)" stroke="#0F172A" strokeWidth="1.2" filter="url(#girderShadow)" />
      {/* Small mechanical axle bolt */}
      <circle cx="74" cy="44.5" r="1" fill="#0F172A" />

      {/* 6. THE EXCELLENT CHECKMARK PAYLOAD (3D look, lifted in front of the mast structure) */}
      <g filter="url(#payloadGlow)">
        {/* Floating shadow backdrop for checking load */}
        <path
          d="M 51,55 L 61.5,65.5 L 81,41"
          fill="none"
          stroke="#0F172A"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
        {/* High-contrast crisp white border envelope */}
        <path
          d="M 51,55 L 61.5,65.5 L 81,41"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="9.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Brilliant luminous orange/gold checkmark highlight */}
        <path
          d="M 51,55 L 61.5,65.5 L 81,41"
          fill="none"
          stroke="url(#luminousGold)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Crisp highlight gloss core thread */}
        <path
          d="M 51.5,55 L 61.5,64.8 L 80,41.8"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </g>

      {/* Red safety indicator light at extreme tip of the Crane Jib */}
      <circle cx="75" cy="22" r="1" fill="#EF4444" className="animate-pulse" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl bg-[#0F172A] p-1 border border-white/10 shadow-lg group",
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
