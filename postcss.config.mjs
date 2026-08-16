/** Tailwind v3 pipeline — do not swap in @tailwindcss/postcss, that is v4 only. */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

export default config
