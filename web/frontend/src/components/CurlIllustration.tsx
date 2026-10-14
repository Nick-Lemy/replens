export function CurlIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 360"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="153" cy="336" rx="104" ry="12" fill="#000" opacity=".2" />
      <path d="m105 211-7 119h44l12-102 14 102h43l-12-119" fill="#30322e" />
      <path d="M114 329H92l-8 13h57v-13 M175 329h37l13 13h-52" fill="#171915" />
      <path d="m131 72-2 26h42l-5-26" fill="#ae7955" />
      <path
        d="M126 30q25-22 47 0l-2 36q-5 18-23 20-20-6-23-22Z"
        fill="#be8b66"
      />
      <path
        d="M124 41q-8-34 25-35 33 0 29 35l-9-14-17-3-22 7Z"
        fill="#252722"
      />
      <path
        d="M126 91q-30 0-40 33l15 63-6 41q55 13 111 0l-7-42 12-62q-9-33-40-33l-20 11Z"
        fill="#20221e"
      />
      <path
        d="m128 101 22 14 21-14 M116 142l-2 66 M185 144l4 64"
        stroke="#383c34"
        strokeWidth="3"
      />
      <path d="m86 120-17 45q-5 14 7 19l18 6 10-16-17-7 15-34" fill="#b6815c" />
      <path d="m75 175 14-55q4-12 14-10l9 7-10 63q-2 16-13 14" fill="#c3946f" />
      <path
        d="m209 120 18 45q5 14-7 19l-18 6-10-16 17-7-15-34"
        fill="#b6815c"
      />
      <path
        d="m220 175-14-55q-4-12-14-10l-9 7 10 63q2 16 13 14"
        fill="#c3946f"
      />
      <g transform="rotate(12 107 113)">
        <rect x="86" y="109" width="43" height="7" rx="3" fill="#999d91" />
        <rect x="81" y="96" width="12" height="32" rx="3" fill="#464b40" />
        <rect x="123" y="96" width="12" height="32" rx="3" fill="#464b40" />
        <path d="M84 101h6 M126 101h6" stroke="#717969" />
      </g>
      <g transform="rotate(-12 190 113)">
        <rect x="169" y="109" width="43" height="7" rx="3" fill="#999d91" />
        <rect x="164" y="96" width="12" height="32" rx="3" fill="#464b40" />
        <rect x="206" y="96" width="12" height="32" rx="3" fill="#464b40" />
        <path d="M167 101h6 M209 101h6" stroke="#717969" />
      </g>
    </svg>
  );
}
