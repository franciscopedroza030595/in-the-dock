import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:      "#0D0A1A",
        surface: "#150F28",
        card:    "#1E1535",
        border:  "#2E2050",
        muted:   "#6B5A9E",
        brand:   "#7C3AED",
        "brand-light": "#A78BFA",
        gold:    "#F59E0B",
        correct: "#10B981",
        wrong:   "#EF4444",
      },
    },
  },
  plugins: [],
};
export default config;
