/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.{html,js,ejs}"],
  theme: {
    extend: {
      colors: {
        body: "#17171F",
        "selected-text": "#A3A3FF",
        theme: "#3F3FFF",
        nav: "#404053",
        secondary: "#9191A4",
        badge: "#3f3F51",
        "input-border": "#565666",
        input: "#2A2A35",
      },
    },
  },
  plugins: [],
};
