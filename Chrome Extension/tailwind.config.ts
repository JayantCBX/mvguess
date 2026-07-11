import type { Config } from "tailwindcss";

export default {
  content: ["./popup.html", "./sidepanel.html", "./src/**/*.{ts,tsx}", "../src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { cinema: { ink: "#070b12", teal: "#35d0ba", rose: "#e5576f", gold: "#f4c95d" } }
    }
  },
  plugins: []
} satisfies Config;
