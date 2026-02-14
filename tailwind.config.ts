import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdfcf5",
          100: "#faf8e8",
          200: "#f5f0c4",
          300: "#f0e6a3",
          400: "#e8dc8a",
          500: "#d4c85c",
          600: "#b8a840",
          700: "#8f7d2e",
          800: "#6b5c22",
          900: "#4a4018",
        },
        gauge: {
          50: "#e8f0e8",
          100: "#d4e4d4",
          200: "#b5d0b5",
          300: "#9cb89a",
          400: "#8fa88d",
          500: "#7a9a78",
          600: "#5f7a5d",
          700: "#4a6048",
          800: "#3a4d38",
          900: "#2d3d2a",
        },
        forest: {
          950: "#15261c",
          900: "#1a2e24",
          800: "#243d32",
          700: "#2d453d",
          600: "#3a5548",
          500: "#4a6b5a",
          400: "#6b8a7a",
          300: "#8fa88d",
        },
        slate: {
          850: "#172033",
          950: "#0b1120",
        },
      },
      fontFamily: {
        sans: ["system-ui", "ui-sans-serif", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
