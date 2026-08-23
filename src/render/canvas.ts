import assertNever from "../color/assertNever";
import { CMAX_P3, CMAX_SRGB, cssOfDisplayP3, type OklchState, oklchGamutInfo, roundByte } from "../color/oklchColor";
import type { ColorSpace } from "../types";

export const SLIDER_CANVAS_DEFAULT_WIDTH = 220;
export const SLIDER_CANVAS_DEFAULT_HEIGHT = 34;
export const PLANE_CANVAS_DEFAULT_WIDTH = 280;
export const PLANE_CANVAS_DEFAULT_HEIGHT = 200;
export const PLANE_MAX_DIM = 240;

export function resizeCanvasForDpr(
	canvas: HTMLCanvasElement,
	defaultWidth: number,
	defaultHeight: number,
	maxDim?: number,
): { ctx: CanvasRenderingContext2D; width: number; height: number } | null {
	const ctx = canvas.getContext("2d", { colorSpace: "display-p3" });
	if (!ctx) {
		return null;
	}
	const dpr = window.devicePixelRatio || 1;
	const cssWidth = canvas.clientWidth || defaultWidth;
	const cssHeight = canvas.clientHeight || defaultHeight;
	let width = Math.max(1, Math.round(cssWidth * dpr));
	let height = Math.max(1, Math.round(cssHeight * dpr));
	if (maxDim) {
		width = Math.min(maxDim, width);
		height = Math.min(maxDim, height);
	}
	if (canvas.width !== width || canvas.height !== height) {
		canvas.width = width;
		canvas.height = height;
	}
	return { ctx, width, height };
}

export function drawSliderCanvas(
	canvas: HTMLCanvasElement,
	colorSpace: ColorSpace,
	renderAt: (t: number) => OklchState,
	showOutOfBounds: boolean,
) {
	const resized = resizeCanvasForDpr(canvas, SLIDER_CANVAS_DEFAULT_WIDTH, SLIDER_CANVAS_DEFAULT_HEIGHT);
	if (!resized) {
		return;
	}
	const { ctx, width, height } = resized;
	const topHeight = Math.floor(height / 2);
	const bottomY = topHeight;
	const bottomHeight = height - topHeight;

	const image = ctx.createImageData(width, height);
	const data = image.data;
	let key: "srgb" | "p3";
	const imageColorSpace = image.colorSpace ?? "srgb";
	switch (imageColorSpace) {
		case "srgb":
			key = "srgb" as const;
			break;
		case "display-p3":
			key = "p3" as const;
			break;
		default:
			return assertNever(imageColorSpace);
	}

	for (let x = 0; x < width; x += 1) {
		const t = width <= 1 ? 0 : x / (width - 1);
		const state = renderAt(t);
		const gamut = oklchGamutInfo(state);
		const triplet = gamut[key];
		const alpha = roundByte(state.a);

		if (gamut.inSrgb || showOutOfBounds) {
			for (let y = 0; y < topHeight; y += 1) {
				const i = (y * width + x) * 4;
				data[i] = roundByte(triplet.r);
				data[i + 1] = roundByte(triplet.g);
				data[i + 2] = roundByte(triplet.b);
				data[i + 3] = alpha;
			}
		}

		if ((colorSpace === "srgb" ? gamut.inSrgb : gamut.inP3) || showOutOfBounds) {
			for (let y = bottomY; y < bottomY + bottomHeight; y += 1) {
				const i = (y * width + x) * 4;
				data[i] = roundByte(triplet.r);
				data[i + 1] = roundByte(triplet.g);
				data[i + 2] = roundByte(triplet.b);
				data[i + 3] = alpha;
			}
		}
	}

	ctx.clearRect(0, 0, width, height);
	ctx.putImageData(image, 0, 0);

	ctx.fillStyle = "#00000022";
	ctx.fillRect(0, topHeight - 0.5, width, 1);
}

export function drawPlaneCanvas(canvas: HTMLCanvasElement, targetColorSpace: ColorSpace, hue: number) {
	const resized = resizeCanvasForDpr(canvas, PLANE_CANVAS_DEFAULT_WIDTH, PLANE_CANVAS_DEFAULT_HEIGHT, PLANE_MAX_DIM);
	if (!resized) {
		return;
	}
	const { ctx, width, height } = resized;
	const cmax = targetColorSpace === "srgb" ? CMAX_SRGB : CMAX_P3;

	const image = ctx.createImageData(width, height);
	const data = image.data;
	let key: "srgb" | "p3";
	const colorSpace = image.colorSpace ?? "srgb";
	switch (colorSpace) {
		case "srgb":
			key = "srgb" as const;
			break;
		case "display-p3":
			key = "p3" as const;
			break;
		default:
			return assertNever(colorSpace);
	}

	const white = oklchGamutInfo({ L: 1, C: 0, H: 0, a: 1 });

	for (let x = 0; x < width; x += 1) {
		const L = width <= 1 ? 0 : x / (width - 1);
		let inSrgb = true;
		for (let y = height - 1; y >= 0; y -= 1) {
			const C = (height <= 1 ? 1 : 1 - y / (height - 1)) * cmax;
			const gamut = oklchGamutInfo({ L, C, H: hue, a: 1 }, true);
			const weAreInP3 = gamut.inP3;
			const weAreInSrgb = gamut.inSrgb;
			if (!weAreInP3 && !weAreInSrgb) {
				// We iterate frm bottom (0 chroma) to top (max chroma), so if we are out of P3 gamut, we are also out of sRGB gamut
				break;
			}
			if (!weAreInSrgb && targetColorSpace === "srgb") continue;

			// We want to draw a white line between the sRGB and P3 gamut
			if (inSrgb !== weAreInSrgb) {
				inSrgb = weAreInSrgb;

				const i = (y * width + x) * 4;
				data[i] = roundByte(white[key].r);
				data[i + 1] = roundByte(white[key].g);
				data[i + 2] = roundByte(white[key].b);
				data[i + 3] = 255;
				continue;
			}

			const i = (y * width + x) * 4;
			data[i] = roundByte(gamut[key].r);
			data[i + 1] = roundByte(gamut[key].g);
			data[i + 2] = roundByte(gamut[key].b);
			data[i + 3] = 255;
		}
	}

	ctx.clearRect(0, 0, width, height);
	ctx.putImageData(image, 0, 0);
}
