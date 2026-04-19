import React from "react";

/* WalletWizz — custom SVG logo icon
   A stylised wallet inside a glowing orbital ring with star accents */
const WalletWizzLogo = ({ size = 36, glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={glow ? { filter: "drop-shadow(0 0 10px #7c3aed) drop-shadow(0 0 22px #06b6d4)" } : {}}
  >
    <defs>
      <linearGradient id="walletGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="50%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
      <linearGradient id="orbitGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
      </linearGradient>
      <radialGradient id="glowCenter" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Outer glow disk */}
    <circle cx="32" cy="32" r="30" fill="url(#glowCenter)" />

    {/* Orbital ring — tilted ellipse */}
    <ellipse
      cx="32" cy="32"
      rx="29" ry="10"
      stroke="url(#orbitGrad)"
      strokeWidth="1.8"
      fill="none"
      transform="rotate(-20 32 32)"
    />
    {/* Second orbital arc (dashed) */}
    <ellipse
      cx="32" cy="32"
      rx="26" ry="8"
      stroke="#a855f7"
      strokeWidth="1"
      strokeDasharray="3 5"
      fill="none"
      strokeOpacity="0.5"
      transform="rotate(30 32 32)"
    />

    {/* Wallet body */}
    <rect x="14" y="22" width="36" height="24" rx="5" fill="url(#walletGrad)" />
    {/* Wallet flap */}
    <path d="M14 28 Q14 22 20 22 H44 Q50 22 50 28 Z" fill="#4f46e5" opacity="0.7" />
    {/* Card slot line */}
    <line x1="20" y1="34" x2="44" y2="34" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
    {/* Coin inside wallet */}
    <circle cx="42" cy="37" r="5" fill="#fbbf24" opacity="0.9" />
    <text x="42" y="41" fontSize="6" textAnchor="middle" fill="#92400e" fontWeight="bold">₹</text>

    {/* Star accents */}
    <circle cx="8"  cy="12" r="1.2" fill="#e879f9" />
    <circle cx="56" cy="10" r="0.9" fill="#67e8f9" />
    <circle cx="58" cy="52" r="1.4" fill="#a78bfa" />
    <circle cx="6"  cy="50" r="1"   fill="#34d399" />
    <circle cx="32" cy="4"  r="1.1" fill="#f472b6" />
  </svg>
);

export default WalletWizzLogo;
