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

See [`demo/index.html`](demo/index.html) for a fuller working example (theming, localization, form participation).

## Attributes / properties

| Attribute      | Property         | Type                                              | Default                    | Notes                                                              |
| -------------- | ---------------- | -------------------------------------------------- | --------------------------- | ------------------------------------------------------------------- |
| `value`        | `.value`         | string (CSS color)                                | —                            | One-directional attribute→property; does not reflect back to the attribute on every drag/keystroke (like `<textarea>`). |
| `default-value`| `.defaultValue`  | string (CSS color)                                | `oklch(0.5382 0.2 0 / 1)`   | Used when `value` is unset, and by native form `reset()`.          |
| `name`         | `.name`          | string                                            | —                            | Enables native `<form>` participation via `ElementInternals`.      |
| `disabled`     | `.disabled`      | boolean                                           | `false`                     | Also force-closes an open popover.                                 |
| `no-alpha`     | `.noAlpha`       | boolean                                           | `false`                     | Hides the Alpha slider.                                             |
| `color-space`  | `.colorSpace`    | `"srgb" \| "display-p3" \| "rec2020" \| "any"`    | `"any"`                     | Which gamut is shown as "in bounds" on the plane/slider gradients. |
| `label-heading`| `.labelHeading`  | string                                            | `"FR Colour picker"`        | Popover heading text.                                               |
| `label-close`  | `.labelClose`    | string                                            | `"Close"`                   | Close button's accessible name.                                     |
| `label-hue`    | `.labelHue`      | string                                            | `"Hue"`                     |                                                                       |
| `label-lightness` | `.labelLightness` | string                                       | `"Lightness"`               |                                                                       |
| `label-chroma` | `.labelChroma`   | string                                            | `"Chroma"`                  |                                                                       |
| `label-alpha`  | `.labelAlpha`    | string                                            | `"Alpha"`                   |                                                                       |
| `label-value`  | `.labelValue`    | string                                            | `"Value"`                   | Label for the raw text-value field.                                 |
| `label-accept` | `.labelAccept`   | string                                            | `"Accept"`                  | Accept button's accessible name.                                    |

Only English strings ship by default; pass `label-*` attributes to localize (see the Dutch example in `demo/index.html`).

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
	--frcp-border: 2px solid #7c3aed;
	--frcp-border-radius: 10px;
	--frcp-color: #4c1d95;
	--frcp-background: #f5f3ff;
}
```

## Form participation

`<fr-colorpicker name="...">` is a [form-associated custom element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#form-associated_custom_elements) — wrap it in a `<form>` and it participates in `FormData` and `form.reset()` like a native control, no hidden `<input>` needed.

## Development

- `npm run dev` — Vite dev server; open `/demo/` for the manual test harness.
- `npm test` / `npm run test:watch` — Vitest.
- `npm run check-all` — typecheck + lint + test.
- `npm run build` — outputs `dist/fr-colorpicker.js` (ESM) + type declarations.

## License

MIT © Fernando van Loenhout
