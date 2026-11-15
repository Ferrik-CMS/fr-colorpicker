# CLAUDE.md

Guidance for Claude Code in this repository.

## What this is

**fr-colorpicker**: a dependency-free OKLCH colour-picker Web Component, `<fr-colorpicker>` (form-associated, Shadow DOM), in
TypeScript, built with Vite into one ES module (`dist/fr-colorpicker.js`). It is meant for any page, not for one project: keep the
element free of project-specific code, styles and paths. MIT licence. The default branch is `master`.

## Commands

```sh
npm install
npm run check-all   # tsc --noEmit, biome check, vitest (green before a PR)
npm run build       # tsc --noEmit, vite build -> dist/fr-colorpicker.js (+ .map, index.d.ts)
npm run dev         # vite, opens index.html with examples (also one with Dutch label-* attributes)
npm run format      # biome check --write
```

## Layout

`src/element.ts` (the custom element), `state/colorReducer.ts` (state), `color/` (OKLCH maths, named colours), `render/canvas.ts` (the
colour plane), `view/` (plane field, popover, icons), `labels.ts` (English texts; a page translates with `label-*` attributes).
Tests sit next to the code (`*.test.ts`, Vitest + jsdom). `value` is a one-way attribute-to-property (it does not write back to the
attribute while dragging); the element fires `input` while dragging and `change` when the value is settled.

## Notes

- Check a visual change in `npm run dev`, in Chromium **and** Firefox.
- Only English strings ship by default; do not add a language file, add `label-*` attributes to the examples instead.
- Leave other people's uncommitted changes alone: `git status` first, `git add` only your own files.
