import React from "react";
export const registry = {
  github: { name: "GitHub", color: "#24292f", symbol: "github", url: "https://github.com/markoderic" },
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
      {a.symbol === "github" ? (
        <svg x="13" y="13" width="38" height="38" viewBox="0 0 16 16">
          <path fill="white" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
      ) : a.symbol === "cat" ? (
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
