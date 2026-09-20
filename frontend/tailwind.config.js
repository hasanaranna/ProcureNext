/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // App Surfaces (aligned with globals.css @theme)
        app: 'var(--color-app)',
        surface: 'var(--color-surface)',
        subtle: 'var(--color-subtle)',

        // Typography
        content: {
          primary: 'var(--color-content-primary)',
          secondary: 'var(--color-content-secondary)',
          muted: 'var(--color-content-muted)',
        },

        // Brand / Action Accents
        brand: {
          navy: 'var(--color-brand-navy)',
          blue: 'var(--color-brand-blue)',
        },

        // Procurement Status Tokens
        status: {
          'approved-bg': 'var(--color-status-approved-bg)',
          'approved-text': 'var(--color-status-approved-text)',
          'pending-bg': 'var(--color-status-pending-bg)',
          'pending-text': 'var(--color-status-pending-text)',
          'rejected-bg': 'var(--color-status-rejected-bg)',
          'rejected-text': 'var(--color-status-rejected-text)',
          'draft-bg': 'var(--color-status-draft-bg)',
          'draft-text': 'var(--color-status-draft-text)',
        },
      },
      borderColor: {
        subtle: 'var(--color-subtle)',
      },
      boxShadow: {
        'subtle-card': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
}
