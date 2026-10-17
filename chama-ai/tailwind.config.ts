import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c1915",
        paper: "#f4efe6",
        moss: "#145c45",
        clay: "#9a4d2e",
      },
      fontFamily: {
        serif: ['"Iowan Old Style"', "Palatino", "Georgia", "serif"],
        sans: ['"Avenir Next"', '"Segoe UI"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
