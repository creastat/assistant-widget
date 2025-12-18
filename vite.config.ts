import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command }) => {
  // Development mode (for demo)
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

  // Build mode (for library)
  // Build both library (ESM) and CDN embed (IIFE) separately
  const buildTarget = process.env.BUILD_TARGET;

  if (buildTarget === 'embed') {
    // CDN embed build (IIFE) - inline CSS
    return {
      plugins: [react()],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/embed.ts'),
          formats: ['iife'],
          name: 'ChatWidget',
          fileName: () => 'embed.js',
        },
        cssCodeSplit: false,
        outDir: 'dist',
        emptyOutDir: false, // Don't clear dist folder
        sourcemap: true,
        minify: 'esbuild',
        rollupOptions: {
          output: {
            // Inline CSS into JS for single-file embed
            inlineDynamicImports: true,
          },
        },
      },
      resolve: {
        alias: {
          '@': resolve(__dirname, './src'),
        },
      },
    };
  }

  // Default: Library build (ESM)
  return {
    plugins: [react()],
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
            // Rename generated CSS to styles.css
            if (assetInfo.name?.endsWith('.css')) return 'styles.css';
            return assetInfo.name || '';
          },
        },
      },
      sourcemap: true,
      minify: 'esbuild',
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  };
});
