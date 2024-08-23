import {
    resolve
} from 'path'
import {
    defineConfig
} from 'vite'

export default defineConfig
({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'demos/demo2/index.html'),
            },
        },
    },
})