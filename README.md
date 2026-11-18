# fr-colorpicker

*Drafted with the help of Claude and reviewed by a human editor.*

A dependency-free OKLCH color-picker Web Component (`<fr-colorpicker>`). No framework, no runtime dependencies, Shadow DOM encapsulated. Ported from a React component ([FR Style Editor](https://github.com/ferrybig/frsted)'s `OklchColorAtom`) for use in plain HTML/JS pages.

## Usage

```html
<script type="module" src="https://unpkg.com/fr-colorpicker/dist/fr-colorpicker.js"></script>
<fr-colorpicker name="brand-color" value="oklch(0.6 0.15 250)"></fr-colorpicker>
```

Or via npm, with a bundler:

```bash
npm install fr-colorpicker
```

```js
import "fr-colorpicker"; // registers <fr-colorpicker>
```

```js
const el = document.querySelector("fr-colorpicker");
el.addEventListener("input", (e) => console.log("live:", e.target.value));
el.addEventListener("change", (e) => console.log("committed:", e.target.value));
```

See [`index.html`](index.html) for a fuller working example (theming, localization, form participation).

## Self-hosting the built files

If you're not using npm or a CDN, `npm run build` (or a release download) produces exactly two files under `dist/` that you need:

- **`fr-colorpicker.js`** — the component itself: a self-registering ES module with no runtime dependencies. Loading it (via `<script type="module" src="...">` or `import`) is all it takes to register `<fr-colorpicker>`.
- **`fr-colorpicker.js.map`** — its source map, so browser devtools can show the original TypeScript source when you step through or set breakpoints while debugging.

Copy **both files together** into your own project (e.g. `assets/fr-colorpicker/`) and reference the `.js` one:

```html
<script type="module" src="/assets/fr-colorpicker/fr-colorpicker.js"></script>
<fr-colorpicker name="brand-color" value="oklch(0.6 0.15 250)"></fr-colorpicker>
```

`fr-colorpicker.js` ends with a `//# sourceMappingURL=fr-colorpicker.js.map` comment, so it expects the map to sit right next to it at that relative path. The component works fine even if you only copy the `.js` file — omitting the map just means devtools can't resolve the original source when debugging, and the browser will log one harmless 404 for it in the console.

Everything else `npm run build` emits under `dist/` (the `index.d.ts` declaration file) is only needed if you're consuming this package from TypeScript tooling — plain HTML/JS pages can ignore it.

## Migrating from `<input type="color">`

`<fr-colorpicker>` is a drop-in-ish replacement for the native color input, upgraded with an OKLCH-based UI, alpha support, and wide-gamut (Display P3) color:

```html
<!-- Before -->
<input type="color" name="brand-color" value="#3366cc" />

<!-- After -->
<script type="module" src="https://unpkg.com/fr-colorpicker/dist/fr-colorpicker.js"></script>
<fr-colorpicker name="brand-color" value="#3366cc"></fr-colorpicker>
```

`name` and `value` carry over unchanged — both elements are form-associated, so no other markup changes are needed for the value to show up in `FormData` / `form.reset()`.

A few differences worth accounting for when migrating:

- **Value format.** The native input always reports (and only accepts) 6-digit hex (`#rrggbb`). `<fr-colorpicker>` accepts any CSS color syntax on `value` (hex, named colors, `rgb()`, `oklch()`, ...) and, by default, emits hex when the color fits in sRGB, falling back to `oklch(...)` for colors outside that gamut. If your backend strictly expects 6-digit hex, either handle/convert out-of-gamut values server-side, or keep users in-gamut with `color-space="srgb"` (see below).
- **Alpha channel.** The native input has no alpha. To keep that restriction, add `no-alpha` — otherwise `<fr-colorpicker>` also lets users pick transparency, and `value` may come back as an 8-digit hex or `oklch(... / a)`.
- **Gamut.** By default the picker can select wide-gamut (Display P3) colors, which can't be represented as 6-digit hex. Add `color-space="srgb"` to constrain both picking and the emitted value to what hex/legacy CSS can represent. Put together, the closest native-input-equivalent setup is:

  ```html
  <fr-colorpicker name="brand-color" value="#3366cc" no-alpha color-space="srgb"></fr-colorpicker>
  ```

- **Events.** Both fire `input` continuously while the user is actively picking and `change` once when they commit, so existing `input`/`change` listeners generally carry over as-is. Unlike the native input (which always commits whatever was last picked when it closes), dismissing `<fr-colorpicker>` via Escape, the backdrop, or the "✕" **cancels** instead of committing — see [Events](#events) below.
- **Styling.** The native input's appearance is OS-controlled and unstyleable; `<fr-colorpicker>` is a normal element you can theme via the `--frcp-*` custom properties — see [Theming](#theming).

## Attributes / properties

| Attribute         | Property          | Type                                              | Default                       | Notes                                                                                                                    |
| ----------------- | ----------------- | ------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `value`           | `.value`          | string (CSS color)                                | —                             | One-directional attribute→property; does not reflect back to the attribute on every drag/keystroke (like `<textarea>`).  |
| `default-value`   | `.defaultValue`   | string (CSS color)                                | `oklch(0.7433 0.1257 316.74)` | Used when `value` is unset, and by native form `reset()`.                                                                |
| `name`            | `.name`           | string                                            | —                             | Enables native `<form>` participation via `ElementInternals`.                                                            |
| `disabled`        | `.disabled`       | boolean                                           | `false`                       | Also force-closes an open popover.                                                                                       |
| `no-alpha`        | `.noAlpha`        | boolean                                           | `false`                       | Hides the Alpha slider.                                                                                                  |
| `color-space`     | `.colorSpace`     | `"srgb" \| "display-p3" \| "rec2020" \| "any"`    | `"any"`                       | Which gamut is shown as "in bounds" on the plane/slider gradients.                                                       |
| `label-heading`   | `.labelHeading`   | string                                            | `"FR Colour picker"`          | Popover heading text.                                                                                                    |
| `label-close`     | `.labelClose`     | string                                            | `"Close"`                     | Close button's accessible name.                                                                                          |
| `label-hue`       | `.labelHue`       | string                                            | `"Hue"`                       |                                                                                                                          |
| `label-lightness` | `.labelLightness` | string                                            | `"Lightness"`                 |                                                                                                                          |
| `label-chroma`    | `.labelChroma`    | string                                            | `"Chroma"`                    |                                                                                                                          |
| `label-alpha`     | `.labelAlpha`     | string                                            | `"Opacity"`                   |                                                                                                                          |
| `label-value`     | `.labelValue`     | string                                            | `"Value"`                     | Label for the raw text-value field.                                                                                      |
| `label-accept`    | `.labelAccept`    | string                                            | `"Accept"`                    | Accept button's accessible name.                                                                                         |
| `label`           | `<none>`          | JSON                                              | `<see above>`                 | A JSON object for above translation strings                                                                              |

Only English strings ship by default; pass `label-*` attributes to localize (see the Dutch example in `index.html`).

## Events

| Event    | Fires                                                                 | `event.target.value` |
| -------- | ---------------------------------------------------------------------- | ---------------------- |
| `input`  | Continuously while dragging/typing, and when a dismiss (Escape, backdrop click, or the "X" button) reverts the edit | The live/reverted value |
| `change` | Once, when the accept checkmark (or Enter in the value field) commits the edit | The committed value |

Dismissing the popover via Escape, clicking the backdrop, or the "X" button all **cancel** (revert to the value the popover was opened with) — only the accept checkmark or Enter commits.

## Theming

The component renders in a Shadow DOM with sensible built-in defaults, so it looks correct with zero setup. To theme it, set these custom properties on `:root` or directly on the element (they inherit through the shadow boundary):

```css
fr-colorpicker {
 --frcp-border: 1px solid #26232a;
 --frcp-border-radius: 4px;
 --frcp-color: #4c1d95;
 --frcp-background: #f5f3ff;
}
```

## Form participation

`<fr-colorpicker name="...">` is a [form-associated custom element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#form-associated_custom_elements) — wrap it in a `<form>` and it participates in `FormData` and `form.reset()` like a native control, no hidden `<input>` needed.

## Development

- `npm run dev` — Vite dev server; open `/` for the manual test harness.
- `npm test` / `npm run test:watch` — Vitest.
- `npm run check-all` — typecheck + lint + test.
- `npm run build` — outputs `dist/fr-colorpicker.js` (ESM) + type declarations.

## License

MIT © Fernando van Loenhout
