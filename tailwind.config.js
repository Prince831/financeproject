/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
      "./backend/resources/views/**/*.blade.php",
    ],
    theme: {
      extend: {
        fontFamily: {
          'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
          'display': ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        },
        colors: {
          // Npontu Technologies Brand Colors
          'npontu': {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9', // Primary blue
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
          },
          // Warm grey/silver palette (Npontu style)
          'warm-grey': {
            50: '#fafbfc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
          },
          // Professional accent colors
          'success': '#10b981',
          'error': '#ef4444',
          'warning': '#f59e0b',
          'accent': '#6366f1',
        },
        backgroundImage: {
          'gradient-primary': 'linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 100%)',
          'gradient-card': 'linear-gradient(135deg, #ffffff 0%, #f5f5f4 100%)',
          'gradient-accent': 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
          'gradient-warm': 'linear-gradient(135deg, #78716c 0%, #57534e 100%)',
          'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
          'silver-gradient': 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 25%, #e2e8f0 50%, #cbd5e1 75%, #94a3b8 100%)',
        },
        boxShadow: {
          'floating': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          'inner-warm': 'inset 0 2px 4px 0 rgba(120, 113, 108, 0.1)',
        },
        animation: {
          'float': 'float 8s ease-in-out infinite',
          'float-slow': 'float 12s ease-in-out infinite',
          'pulse-warm': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'drift': 'drift 15s ease-in-out infinite',
        },
        keyframes: {
          float: {
            '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
            '25%': { transform: 'translateY(-15px) translateX(10px)' },
            '50%': { transform: 'translateY(-25px) translateX(-5px)' },
            '75%': { transform: 'translateY(-10px) translateX(-10px)' },
          },
          drift: {
            '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
            '33%': { transform: 'translate(20px, -10px) rotate(2deg)' },
            '66%': { transform: 'translate(-15px, 15px) rotate(-1deg)' },
          },
        },
      },
    },
    plugins: [],
  }