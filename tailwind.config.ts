import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#171512",
        cream: "#f6f1e8",
        coral: "#ff6b4a",
        lime: "#c9f26b",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(31, 24, 15, 0.10)",
      },
    },
  },
  plugins: [],
} satisfies Config;
