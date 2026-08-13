/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Design tokens chosen for the actual use context, not defaults:
      // - `trust` (deep teal): primary brand/action color. Teal reads as
      //   clinical/trustworthy without the coldness of pure blue, and has
      //   strong contrast against both light and dark surfaces for outdoor/
      //   low-light clinic use on cheap Android screens.
      // - `emergency`: reserved ONLY for the Emergency Responder view and
      //   critical-info badges (allergies, chronic conditions) — a color
      //   that appears nowhere else in the app is a strong quiet signal
      //   that "this screen/badge means something different."
      // - `warmth`: accent for positive/success states (consent approved,
      //   sync complete) — warm rather than a generic green, to feel human
      //   rather than clinical-only.
      // - `neutral`: high-contrast warm grays (not cool/blue-grays) for
      //   readability in bright outdoor light, common at outdoor worksites.
      colors: {
        trust: {
          50: '#E1F5EE', 100: '#9FE1CB', 200: '#5DCAA5', 400: '#1D9E75',
          600: '#0F6E56', 800: '#085041', 900: '#04342C',
        },
        emergency: {
          50: '#FCEBEB', 100: '#F7C1C1', 200: '#F09595', 400: '#E24B4A',
          600: '#A32D2D', 800: '#791F1F', 900: '#501313',
        },
        warmth: {
          50: '#EAF3DE', 100: '#C0DD97', 200: '#97C459', 400: '#639922',
          600: '#3B6D11', 800: '#27500A',
        },
        neutral: {
          50: '#F1EFE8', 100: '#D3D1C7', 200: '#B4B2A9', 400: '#888780',
          600: '#5F5E5A', 800: '#444441', 900: '#2C2C2A',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
