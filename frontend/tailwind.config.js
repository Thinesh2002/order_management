export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        soft: '#f8fafc',
        line: '#e2e8f0',
        brand: '#1e3a5f',
        brandDeep: '#102a43',
        gold: '#d97706',
      },
      boxShadow: {
        soft: '0 10px 25px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};
