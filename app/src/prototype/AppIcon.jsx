import React from "react";
export const registry = {
  catmario: { name: "Cat Mario", color: "#759abb", symbol: "cat" },
  finder: { name: "Finder", color: "#248be2", symbol: "finder" },
  premiere: { name: "Premiere Pro", color: "#27245e", symbol: "Pr" },
  vscode: { name: "VS Code", color: "#147ab5", symbol: "code" },
  xcode: { name: "Xcode", color: "#177ec4", symbol: "hammer" },
  notch: { name: "Notch", color: "#252728", symbol: "N" },
  youtube: { name: "YouTube Studio", color: "#ca252c", symbol: "play" },
  preview: { name: "Preview", color: "#5e91aa", symbol: "page" },
  mail: { name: "Mail", color: "#248be2", symbol: "mail" },
  controls: { name: "Controls", color: "#626d76", symbol: "?" },
};
export default function AppIcon({ id }) {
  const a = registry[id];
  return (
    <svg className="app-icon" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`shine-${id}`} x2="0" y2="1">
          <stop stopColor="#fff" stopOpacity=".27" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill={a.color} />
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="14"
        fill={`url(#shine-${id})`}
      />
      {a.symbol === "cat" ? (
        <svg x="17" y="10" width="30" height="42" viewBox="0 0 30 36">
          <image href={`${import.meta.env?.BASE_URL ?? '/'}prototype-vendor/cat-mario/player.PNG`} width="169" height="44" style={{imageRendering:"pixelated"}} />
        </svg>
      ) : a.symbol === "finder" ? (
        <>
          <path d="M32 2H48Q62 2 62 17V47Q62 62 47 62H32Z" fill="#c2e6ff" />
          <path
            d="M34 9L29 35H36V55M16 39Q32 50 48 39M19 21V26M45 21V26"
            stroke="#103f63"
            strokeWidth="2.5"
            fill="none"
          />
        </>
      ) : a.symbol === "code" ? (
        <path
          d="M43 10L21 29L12 23L8 28L20 36L43 54L55 48V16ZM43 23V42L28 32Z"
          fill="#eaf7ff"
        />
      ) : a.symbol === "hammer" ? (
        <>
          <path
            d="M18 49 39 24"
            stroke="#163e67"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M18 48 39 23"
            stroke="#e3c49b"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="m28 16 8-7 17 15-7 8-7-6-4 1-8-7Z"
            fill="#eaf3fa"
            stroke="#b7d5eb"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </>
      ) : a.symbol === "page" ? (
        <>
          <path d="M16 9H41L49 18V55H16Z" fill="#fff" />
          <path
            d="M23 25H41M23 32H41M23 39H37M23 46H39"
            stroke="#4f6779"
            strokeWidth="2"
          />
        </>
      ) : a.symbol === "mail" ? (
        <>
          <rect x="12" y="18" width="40" height="29" rx="3" fill="white" />
          <path
            d="M13 20L32 35L51 20"
            stroke="#248be2"
            strokeWidth="2"
            fill="none"
          />
        </>
      ) : a.symbol === "play" ? (
        <path d="M27 23L42 32L27 41Z" fill="white" />
      ) : (
        <text
          x="32"
          y="42"
          textAnchor="middle"
          fill={id === "premiere" ? "#d7b6ff" : "white"}
          fontSize="31"
          fontWeight="650"
          fontFamily="system-ui"
        >
          {a.symbol}
        </text>
      )}
    </svg>
  );
}
