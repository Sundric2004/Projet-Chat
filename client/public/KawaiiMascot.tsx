export default function KawaiiMascot() {
  return (
    <div style={{ marginBottom: "30px" }}>
      <svg
        width="190"
        height="190"
        viewBox="0 0 200 200"
        style={{ animation: "floatCute 3s ease-in-out infinite" }}
      >
        {/* Ombre */}
        <ellipse cx="100" cy="175" rx="45" ry="10" fill="rgba(0,0,0,0.1)" />

        {/* Corps */}
        <circle
          cx="100"
          cy="110"
          r="60"
          fill="#fff8fb"
          stroke="#333"
          strokeWidth="4"
        />

        {/* Oreilles */}
        <path d="M50 40 Q40 10 80 35" fill="#fff8fb" stroke="#333" strokeWidth="4" />
        <path d="M150 40 Q160 10 120 35" fill="#fff8fb" stroke="#333" strokeWidth="4" />

        {/* Intérieur oreilles */}
        <path d="M60 40 Q55 20 75 35" fill="#ffb6d9" />
        <path d="M140 40 Q145 20 125 35" fill="#ffb6d9" />

        {/* 🎀 Bandeau sportif */}
        <rect
          x="45"
          y="60"
          width="110"
          height="18"
          rx="9"
          fill="#ff4fa3"
        />
        <rect
          x="92"
          y="60"
          width="16"
          height="18"
          fill="#ff2e8a"
        />

        {/* Yeux */}
        <circle cx="75" cy="100" r="15" fill="#333" />
        <circle cx="125" cy="100" r="15" fill="#333" />

        {/* Reflets */}
        <circle cx="70" cy="95" r="5" fill="white" />
        <circle cx="120" cy="95" r="5" fill="white" />

        {/* Joues */}
        <circle cx="60" cy="115" r="10" fill="#ff9ecf" opacity="0.6" />
        <circle cx="140" cy="115" r="10" fill="#ff9ecf" opacity="0.6" />

        {/* Bouche */}
        <path
          d="M85 120 Q100 145 115 120"
          fill="#ff7ab6"
          stroke="#333"
          strokeWidth="3"
        />

        {/* Langue */}
        <ellipse cx="100" cy="132" rx="6" ry="4" fill="#ffb6d9" />

        {/* Bras */}
        <circle cx="40" cy="115" r="18" fill="#fff8fb" stroke="#333" strokeWidth="4" />

        {/* 💪 Haltère animée */}
        <g style={{ animation: "lift 1.2s infinite ease-in-out" }}>
          <circle cx="160" cy="115" r="18" fill="#fff8fb" stroke="#333" strokeWidth="4" />
          <rect x="160" y="110" width="35" height="8" rx="4" fill="#555" />
          <circle cx="155" cy="114" r="8" fill="#333" />
          <circle cx="195" cy="114" r="8" fill="#333" />
        </g>

      </svg>
    </div>
  )
}
