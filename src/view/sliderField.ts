import type { OklchState } from "../color/oklchColor";
import { drawSliderCanvas } from "../render/canvas";
import type { ColorSpace } from "../types";

export interface SliderFieldOptions {
	min: number;
	max: number;
	step: number;
	showOutOfBounds?: boolean;
	onChange: (next: number) => void;
	onCommit: () => void;
}

export interface SliderField {
	element: HTMLSpanElement;
	setLabel(label: string): void;
	update(value: number, renderAt: (t: number) => OklchState, targetColorSpace: ColorSpace): void;
	destroy(): void;
}

let idCounter = 0;

/**
 * Ported from SliderField in OklchColorAtom.tsx: a labeled row pairing a
 * gradient-backed range slider with a number input, reused for the Hue,
 * Lightness, Chroma, and Alpha rows. A native `change` listener (not `input`)
 * on the range element drives `onCommit`, since native range inputs only fire
 * `change` on release -- this is why the source needs a raw DOM listener
 * instead of a React onChange handler for the commit signal.
 */
export function createSliderField(options: SliderFieldOptions): SliderField {
	const { min, max, step, showOutOfBounds = false, onChange, onCommit } = options;
	const inputId = `frcp-slider-${idCounter++}`;
	const displayPrecision = 1 / step;

	const row = document.createElement("span");
	row.className = "row";

	const label = document.createElement("label");
	label.htmlFor = inputId;
	label.className = "row-label";
	row.appendChild(label);

	const trackWrap = document.createElement("span");
	trackWrap.className = "field row-input track-wrap";
	row.appendChild(trackWrap);

	const canvas = document.createElement("canvas");
	canvas.className = "canvas";
	trackWrap.appendChild(canvas);

	const slider = document.createElement("input");
	slider.type = "range";
	slider.className = "slider";
	slider.min = String(min);
	slider.max = String(max);
	slider.step = String(step);
	trackWrap.appendChild(slider);

	const num = document.createElement("input");
	num.type = "number";
	num.id = inputId;
	num.className = "field num";
	num.min = String(min);
	num.max = String(max);
	num.step = String(step);
	row.appendChild(num);

	slider.addEventListener("input", () => onChange(parseFloat(slider.value)));
	slider.addEventListener("change", () => onCommit());
	num.addEventListener("input", () => onChange(parseFloat(num.value || "0")));

	let currentRenderAt: ((t: number) => OklchState) | null = null;
	let currentColorSpace: ColorSpace = "any";

	function redraw() {
		if (currentRenderAt) {
			drawSliderCanvas(canvas, currentColorSpace, currentRenderAt, showOutOfBounds);
		}
	}

	const observer = new ResizeObserver(() => redraw());
	observer.observe(canvas);

	return {
		element: row,
		setLabel(text: string) {
			label.textContent = text;
			label.title = text;
		},
		update(value, renderAt, targetColorSpace) {
			currentRenderAt = renderAt;
			currentColorSpace = targetColorSpace;
			slider.value = String(value);
			num.value = String(Number.isFinite(value) ? Math.round(value * displayPrecision) / displayPrecision : 0);
			redraw();
		},
		destroy() {
			observer.disconnect();
		},
	};
}
