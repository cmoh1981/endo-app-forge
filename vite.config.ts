import devServer from '@hono/vite-dev-server'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      build: {
        rollupOptions: {
          input: './src/client.ts',
          output: { entryFileNames: 'static/client.js' },
        },
      },
    }
  }
  return {
    ssr: {
      external: ['__STATIC_CONTENT_MANIFEST'],
    },
    plugins: [
      devServer({
        entry: 'src/index.tsx',
      }),
    ],
    build: {
      ssr: true,
      rollupOptions: {
        input: 'src/index.tsx',
        output: {
          format: 'es',
          entryFileNames: '_worker.js',
          dir: 'dist',
        },
      },
      copyPublicDir: true,
    },
  }
})
