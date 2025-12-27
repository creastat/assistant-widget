import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      plugins: [react()],
      root: '.',
      publicDir: 'demo/public',
      resolve: {
        alias: {
          '@': resolve(__dirname, './src'),
        },
      },
    };
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    build: {
      lib: {
        entry: {
          index: resolve(__dirname, 'src/index.ts'),
          'react/index': resolve(__dirname, 'src/react/index.tsx'),
          'generator': resolve(__dirname, 'src/generator.ts'),
        },
        formats: ['es'],
        name: 'ChatWidget',
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'react/jsx-runtime'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) return 'styles.css';
            return assetInfo.name || '';
          },
        },
      },
      sourcemap: true,
      minify: 'esbuild',
    },
  };
});
