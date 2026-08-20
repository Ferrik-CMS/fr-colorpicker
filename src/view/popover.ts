import { CMAX_P3, formatColor, type OklchState } from "../color/oklchColor";
import type { DispatchOklchState } from "../state/colorReducer";
import type { ColorSpace, OpenDirection } from "../types";
import { createCloseIcon, setIconTitle } from "./icons";
import { createPlaneField } from "./planeField";
import { createSliderField, type SliderField } from "./sliderField";
import { createSwatchButton } from "./swatchButton";
import { createValueRow } from "./valueRow";

export interface PopoverLabels {
	heading: string;
	close: string;
	hue: string;
	lightness: string;
	chroma: string;
	alpha: string;
	value: string;
	accept: string;
}

export interface PopoverCallbacks {
	onChange: DispatchOklchState;
	onCommit: () => void;
	onAccept: () => void;
	onCancel: () => void;
	onValueInput: (raw: string) => void;
}

export interface PopoverUpdateData {
	currentValue: OklchState;
	colorSpace: ColorSpace;
	noAlpha: boolean;
	preview: string;
}

export interface Popover {
	dialog: HTMLDialogElement;
	open(direction: OpenDirection): void;
	close(): void;
	update(data: PopoverUpdateData): void;
	setLabels(labels: PopoverLabels): void;
	destroy(): void;
}

/**
 * Assembles the dialog: head (mirror swatch + heading + close button), and a
 * form containing the L/C plane, the four Hue/Lightness/Chroma/Alpha slider
 * rows, and the value-text row.
 *
 * Dismiss wiring is an intentional deviation from OklchColorAtom.tsx: there,
 * the dialog's native `close` event (fired by Escape or backdrop-click, via
 * `closedby="any"`) was wired to *accept*, and only the header "X" button
 * canceled. After reconsidering, `<fr-colorpicker>` wires the native `close`
 * event to *cancel* instead, so Escape / backdrop-click / "X" all revert to
 * the value at open-time -- only the accept checkmark (or Enter, which
 * submits the form) commits.
 */
export function createPopover(callbacks: PopoverCallbacks): Popover {
	const { onChange, onCommit, onAccept, onCancel, onValueInput } = callbacks;

	const dialog = document.createElement("dialog");
	dialog.className = "popover";

	const form = document.createElement("form");
	form.className = "form";
	form.setAttribute("method", "dialog");
	dialog.appendChild(form);

	const head = document.createElement("div");
	head.className = "head";
	form.appendChild(head);

	const headSwatch = createSwatchButton("submit");
	head.appendChild(headSwatch.element);

	const headingText = document.createElement("div");
	headingText.className = "head-text";
	head.appendChild(headingText);

	const closeButton = document.createElement("button");
	closeButton.type = "button";
	closeButton.className = "icon-btn";
	const closeIcon = createCloseIcon("Close");
	closeButton.appendChild(closeIcon);
	head.appendChild(closeButton);

	const plane = createPlaneField({ onChange, onCommit });
	form.appendChild(plane.element);

	const hueSlider = createSliderField({
		min: 0,
		max: 360,
		step: 0.1,
		onChange: (next) => onChange({ H: next }),
		onCommit,
	});
	const lightnessSlider = createSliderField({
		min: 0,
		max: 1,
		step: 0.001,
		onChange: (next) => onChange({ L: next }),
		onCommit,
	});
	const chromaSlider = createSliderField({
		min: 0,
		max: CMAX_P3,
		step: 0.001,
		onChange: (next) => onChange({ C: next }),
		onCommit,
	});
	const alphaSlider = createSliderField({
		min: 0,
		max: 1,
		step: 0.01,
		showOutOfBounds: true,
		onChange: (next) => onChange({ a: next }),
		onCommit,
	});
	const sliders: SliderField[] = [hueSlider, lightnessSlider, chromaSlider, alphaSlider];
	for (const slider of sliders) {
		form.appendChild(slider.element);
	}

	const valueRow = createValueRow({ onChange: onValueInput, onCommit });
	form.appendChild(valueRow.element);

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		onAccept();
	});
	dialog.addEventListener("close", () => {
		onCancel();
	});
	closeButton.addEventListener("click", (event) => {
		event.preventDefault();
		onCancel();
	});

	return {
		dialog,
		open(direction: OpenDirection) {
			dialog.style.left = `${direction.left}px`;
			dialog.style.top = `${direction.top}px`;
			// Guarded so callers can call open() unconditionally on every render
			// while the dialog is open -- the buffer-reset/focus side effects
			// (compensating for the persistent, non-remounted DOM) should only
			// fire once, on the actual closed->open transition.
			if (!dialog.open) {
				dialog.showModal();
				valueRow.resetBuffer();
				valueRow.focusAndSelect();
			}
		},
		close() {
			if (dialog.open) {
				dialog.close();
			}
		},
		update(data: PopoverUpdateData) {
			const { currentValue, colorSpace, noAlpha, preview } = data;
			headSwatch.setPreview(preview);
			plane.update(currentValue.H, currentValue.L, currentValue.C, colorSpace);
			hueSlider.update(currentValue.H, (t) => ({ H: t * 360, C: 0.118, L: 0.7255, a: 1 }), colorSpace);
			lightnessSlider.update(currentValue.L, (t) => ({ ...currentValue, L: t, a: 1 }), colorSpace);
			chromaSlider.update(currentValue.C, (t) => ({ ...currentValue, C: t * CMAX_P3, a: 1 }), colorSpace);
			alphaSlider.update(currentValue.a, (t) => ({ ...currentValue, a: t }), colorSpace);
			alphaSlider.element.hidden = Boolean(noAlpha);
			// The value-text field prefers "hex" formatting (falls back to
			// "oklch" automatically whenever out of sRGB gamut) -- matches
			// `formatColor(currentValue, "hex")` in the source (line 747).
			valueRow.update(formatColor(currentValue, "hex"));
		},
		setLabels(labels: PopoverLabels) {
			headingText.textContent = labels.heading;
			setIconTitle(closeIcon, labels.close);
			hueSlider.setLabel(labels.hue);
			lightnessSlider.setLabel(labels.lightness);
			chromaSlider.setLabel(labels.chroma);
			alphaSlider.setLabel(labels.alpha);
			valueRow.setLabels(labels.value, labels.accept);
		},
		destroy() {
			plane.destroy();
			for (const slider of sliders) {
				slider.destroy();
			}
		},
	};
}
