import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0b0f",
          900: "#12141a",
          800: "#1b1e27",
          700: "#272b38",
          600: "#3a3f52",
          500: "#565c74",
          400: "#7d84a0",
          300: "#a6acc4",
          200: "#d0d4e4",
          100: "#eceef7",
          50: "#f6f7fb",
        },
        brand: {
          600: "#4338ca",
          500: "#5b4fe0",
          400: "#7c72ea",
          300: "#a29bf1",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 6px -1px rgb(0 0 0 / 0.04)",
        card: "0 2px 8px -2px rgb(15 15 25 / 0.08), 0 1px 2px -1px rgb(15 15 25 / 0.04)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
