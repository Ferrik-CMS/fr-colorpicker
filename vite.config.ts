import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
	build: {
		lib: {
			entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
			formats: ["es"],
			fileName: () => "fr-colorpicker.js",
		},
		outDir: "dist",
		emptyOutDir: true,
		sourcemap: true,
	},
	plugins: [dts({ rollupTypes: true, include: ["src"], exclude: ["src/**/*.test.ts"] })],
});
