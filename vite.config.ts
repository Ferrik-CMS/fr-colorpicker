import { fileURLToPath } from "node:url";
import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

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
	// bundleTypes rolls the whole declaration graph into one dist/index.d.ts
	// matching the single bundled dist/fr-colorpicker.js -- without it, the
	// emitted .d.ts files mirror src/'s module structure (relative imports
	// like `./element`) while the JS is one flat file, so those imports have
	// no matching .js sibling to resolve against under stricter (Node16/
	// NodeNext) module resolution.
	plugins: [dts({ bundleTypes: true, include: ["src"], exclude: ["src/**/*.test.ts"] })],
});
