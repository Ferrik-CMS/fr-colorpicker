import { CMAX_P3, CMAX_SRGB, clamp } from "../color/oklchColor";
import { drawPlaneCanvas } from "../render/canvas";
import type { DispatchOklchState } from "../state/colorReducer";
import type { ColorSpace } from "../types";

export interface PlaneFieldOptions {
	onChange: DispatchOklchState;
	onCommit: () => void;
}

export interface PlaneField {
	element: HTMLDivElement;
	update(hue: number, lightness: number, chroma: number, targetColorSpace: ColorSpace): void;
	destroy(): void;
}

/**
 * Ported from LCPlaneField in OklchColorAtom.tsx. The wrapping element keeps
 * `aria-hidden="true"` + `tabindex="-1"` from the source, which makes its
 * keydown handling (arrow keys / Enter) effectively unreachable via keyboard
 * -- preserved verbatim rather than "fixed", per the extraction plan.
 */
export function createPlaneField(options: PlaneFieldOptions): PlaneField {
	const { onChange, onCommit } = options;

	const plane = document.createElement("div");
	plane.className = "plane";
	plane.setAttribute("aria-hidden", "true");
	plane.tabIndex = -1;

	const canvas = document.createElement("canvas");
	canvas.className = "plane-canvas";
	plane.appendChild(canvas);

	const marker = document.createElement("span");
	marker.className = "plane-marker";
	plane.appendChild(marker);

	let currentHue = -1;
	let currentLightness = 0;
	let currentChroma = 0;
	let redrawTask = 0;
	let currentColorSpace: ColorSpace = "any";

	function pick(clientX: number, clientY: number) {
		const rect = plane.getBoundingClientRect();
		const x = Math.round(clamp((clientX - rect.left) / rect.width, 0, 1) * 1000) / 1000;
		const y = Math.round(clamp((clientY - rect.top) / rect.height, 0, 1) * 1000) / 1000;
		const cmax = currentColorSpace === "srgb" ? CMAX_SRGB : CMAX_P3;
		onChange({ L: x, C: (1 - y) * cmax });
	}

	plane.addEventListener("pointerdown", (event) => {
		plane.setPointerCapture(event.pointerId);
		pick(event.clientX, event.clientY);
	});
	plane.addEventListener("pointermove", (event) => {
		if (event.buttons !== 1) {
			return;
		}
		pick(event.clientX, event.clientY);
	});
	plane.addEventListener("pointerup", () => {
		onCommit();
	});

	plane.addEventListener("keydown", (event) => {
		const step = event.shiftKey ? 0.1 : 0.01;
		if (event.key === "ArrowUp") {
			event.preventDefault();
			onChange({ L: currentLightness, C: clamp(currentChroma + step, 0, CMAX_P3) });
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			onChange({ L: currentLightness, C: clamp(currentChroma - step, 0, CMAX_P3) });
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			onChange({ L: clamp(currentLightness + step, 0, 1), C: currentChroma });
		} else if (event.key === "ArrowLeft") {
			event.preventDefault();
			onChange({ L: clamp(currentLightness - step, 0, 1), C: currentChroma });
		} else if (event.key === "Enter") {
			event.preventDefault();
			plane.closest("form")?.requestSubmit();
		}
	});

	function redraw() {
		redrawTask = 0;
		drawPlaneCanvas(canvas, currentColorSpace, currentHue);
	}

	const observer = new ResizeObserver(() => redraw());
	observer.observe(canvas);

	return {
		element: plane,
		update(hue, lightness, chroma, targetColorSpace) {
			// The plane's gradient bitmap only depends on hue + targetColorSpace,
			// not lightness/chroma (which only move the marker) -- matches the
			// source's `useEffect(..., [hue, targetColorSpace])` dependency list.
			const forceRedraw = currentHue === -1;
			const needsRedraw = hue !== currentHue || targetColorSpace !== currentColorSpace;
			currentHue = hue;
			currentLightness = lightness;
			currentChroma = chroma;
			currentColorSpace = targetColorSpace;
			if (forceRedraw && !redrawTask) {
				redraw();
			} else if (needsRedraw && !redrawTask) {
				redrawTask = requestAnimationFrame(redraw);
			}

			const cmax = targetColorSpace === "srgb" ? CMAX_SRGB : CMAX_P3;
			marker.style.left = `${clamp(lightness, 0, 1) * 100}%`;
			marker.style.top = `${clamp(1 - chroma / cmax, 0, 1) * 100}%`;
		},
		destroy() {
			observer.disconnect();
		},
	};
}
