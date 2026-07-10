import type { Config } from "tailwindcss";

export default {
  content: ["./popup.html", "./game.html", "./src/**/*.{ts,tsx}", "./Chrome Extension/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cinema: {
          ink: "#070812",
          panel: "#111426",
          gold: "#f6c85f",
          rose: "#e5576f",
          teal: "#35d0ba",
          violet: "#8b5cf6"
        }
      },
      boxShadow: {
        glow: "0 0 40px rgba(246, 200, 95, 0.18)"
      }
    }
  },
  plugins: []
} satisfies Config;
