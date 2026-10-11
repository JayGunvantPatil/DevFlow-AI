/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                dev: {
                    bg: '#0d1117',
                    surface: '#161b22',
                    surfaceHover: '#1c2128',
                    subtle: '#21262d',
                    border: '#30363d',
                    borderHighlight: '#3d444d',
                    text: '#c9d1d9',
                    textMuted: '#8b949e',
                    textSubtle: '#6e7681',
                    heading: '#f0f6fc',
                    accent: '#238636',
                    accentHover: '#2ea043',
                    accentBorder: '#3fb950',
                    accentSubtle: 'rgba(35, 134, 54, 0.15)',
                    blue: '#58a6ff',
                    blueSubtle: 'rgba(56, 139, 253, 0.15)',
                    purple: '#bc8cff',
                    purpleSubtle: 'rgba(188, 140, 255, 0.15)',
                    amber: '#d29922',
                    amberSubtle: 'rgba(210, 153, 34, 0.15)',
                    red: '#f85149',
                    redSubtle: 'rgba(248, 81, 73, 0.15)',
                }
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
            boxShadow: {
                'dev-card': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
                'dev-modal': '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            }
        },
    },
    plugins: [],
}
