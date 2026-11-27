export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--line2)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--foreground)" },
        primary: { DEFAULT: "var(--primary)", foreground: "var(--surface)" },
        secondary: { DEFAULT: "var(--surface-2)", foreground: "var(--foreground)" },
        muted: { DEFAULT: "var(--surface-2)", foreground: "var(--muted)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--surface)" },
        shad: { 950: "#07150d", 900: "#0b2113", 800: "#12351f", 500: "#08a653", 300: "#62d991" }
      }
    }
  },
  plugins: []
};
