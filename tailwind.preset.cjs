// Colour tokens for SuvarṇaKani. Neutrals (slate, white, black) and the two app
// surfaces read CSS variables, so a second theme only swaps the variables.
// The variables are defined by the app itself (THEME_CSS in SuvarnaKani.jsx).
// Use this file as a Tailwind preset when dropping the JSX into another project:
//   module.exports = { presets: [require("./tailwind.preset.cjs")], content: [...] }
const v = (name) => `rgb(var(--sk-${name}) / <alpha-value>)`;
module.exports = {
  theme: {
    extend: {
      colors: {
        white: v("white"),
        black: v("black"),
        slate: { 50: v("slate-50"), 100: v("slate-100"), 200: v("slate-200"), 300: v("slate-300"), 400: v("slate-400"), 500: v("slate-500"), 600: v("slate-600"), 700: v("slate-700"), 800: v("slate-800"), 900: v("slate-900"), 950: v("slate-950") },
        sk: { bg: v("bg"), panel: v("panel"), ink: v("ink"), gold: v("gold") },
      },
    },
  },
};
