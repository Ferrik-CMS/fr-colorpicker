import { NAMED_COLORS } from "./namedColors";
import { applyMat3, LMS_TO_LINEAR_P3, LMS_TO_LINEAR_SRGB, OKLAB_TO_LMS_PRIME } from "./oklchMatrices";

export interface OklchState {
	L: number;
	C: number;
	H: number;
	a: number;
}

export interface EncodedTriplet {
	r: number;
	g: number;
	b: number;
}

export interface GamutInfo {
	srgb: EncodedTriplet;
	p3: EncodedTriplet;
	inSrgb: boolean;
	inP3: boolean;
}

export const CMAX_P3 = 0.4;
export const CMAX_SRGB = 0.31;
export const CMAX_REC2020 = 0.5;

export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

export function roundByte(value: number): number {
	return Math.round(clamp(value, 0, 1) * 255);
}

function oklchToLms(L: number, C: number, H: number): [number, number, number] {
	const hr = (H * Math.PI) / 180;
	const a = Math.cos(hr) * C;
	const b = Math.sin(hr) * C;
	return applyMat3(OKLAB_TO_LMS_PRIME, [L, a, b]);
}

function oklchToLrgb(L: number, C: number, H: number): [number, number, number] {
	const [l_, m_, s_] = oklchToLms(L, C, H);
	return [l_ ** 3, m_ ** 3, s_ ** 3];
}

function enc(x: number): number {
	return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
}

function lin(x: number): number {
	return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function linearToEncoded(linear: [number, number, number]): EncodedTriplet {
	return {
		r: clamp(enc(linear[0]), 0, 1),
		g: clamp(enc(linear[1]), 0, 1),
		b: clamp(enc(linear[2]), 0, 1),
	};
}

const GAMUT_EPSILON = 0.0005;
const GAMUT_EPSILON_LOSSY = 0.005;
/**
 * A channel going negative is the "hits zero" gamut face, which is homogeneous
 * of degree 3 in lightness (channel = L^3 * g(S) for S = C/L). A flat absolute
 * epsilon on that channel is therefore an increasingly generous *relative*
 * tolerance as L -> 0, letting chroma that's genuinely outside the gamut near
 * black still read as in-gamut. Scale the lower bound by L^3 so the tolerance
 * stays meaningful at every lightness.
 */
function isInGamutLinear(linear: [number, number, number], lightness: number, epsilon = GAMUT_EPSILON): boolean {
	const lowerBound = -epsilon * Math.max(lightness, 0) ** 3;
	return linear.every((v) => v >= lowerBound && v <= 1 + epsilon);
}

export function oklchGamutInfo(state: OklchState, lossy: boolean = false): GamutInfo {
	const lms = oklchToLrgb(state.L, state.C, state.H);
	const srgbLinear = applyMat3(LMS_TO_LINEAR_SRGB, lms);
	const p3Linear = applyMat3(LMS_TO_LINEAR_P3, lms);

	const epsilon = lossy ? GAMUT_EPSILON_LOSSY : GAMUT_EPSILON;

	return {
		srgb: linearToEncoded(srgbLinear),
		p3: linearToEncoded(p3Linear),
		inSrgb: isInGamutLinear(srgbLinear, state.L, epsilon),
		inP3: isInGamutLinear(p3Linear, state.L, epsilon),
	};
}

function oklchToRgb(state: OklchState): {
	r: number;
	g: number;
	b: number;
	inGamut: boolean;
} {
	const info = oklchGamutInfo(state);
	return {
		r: roundByte(info.srgb.r),
		g: roundByte(info.srgb.g),
		b: roundByte(info.srgb.b),
		inGamut: info.inSrgb,
	};
}

function rgbToOklch(r: number, g: number, b: number): OklchState {
	const rr = lin(r / 255);
	const gg = lin(g / 255);
	const bb = lin(b / 255);
	const l = 0.4122214708 * rr + 0.5363325363 * gg + 0.0514459929 * bb;
	const m = 0.2119034982 * rr + 0.6806995451 * gg + 0.1073969566 * bb;
	const s = 0.0883024619 * rr + 0.2817188376 * gg + 0.6299787005 * bb;
	const l_ = Math.cbrt(l);
	const m_ = Math.cbrt(m);
	const s_ = Math.cbrt(s);
	const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
	const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
	const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
	let H = (Math.atan2(B, A) * 180) / Math.PI;
	if (H < 0) {
		H += 360;
	}
	return { L, C: Math.sqrt(A * A + B * B), H, a: 1 };
}

/**
 * Pads a partially-typed hex color (1-7 digits) out to 8 digits (RRGGBBAA) so
 * that `parseColor` can give a live preview while the user is still typing.
 */
function normalizeHexToRgba8(hex: string): string {
	switch (hex.length) {
		case 0:
			// No hex digits, treat as black
			return "000000ff";
		case 1:
			// Invalid 1-digit hex, append zeros and full alpha
			return `${hex[0]}${hex[0]}0000ff`;
		case 2:
			// Invalid 2-digit hex, append zeros and full alpha
			return `${hex[0]}${hex[0]}${hex[1]}${hex[1]}00ff`;
		case 3:
			// Valid 3-digit hex is RGB
			return `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}ff`;
		case 4:
			// Valid 4-digit hex is RGBA
			return `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
		case 5:
			// Invalid 5-digit hex, append 0 and full alpha
			return `${hex}0ff`;
		case 6:
			// Valid 6-digit hex is RRGGBB, append full alpha
			return `${hex}ff`;
		case 7:
			// Invalid 7-digit hex, repeat last digit
			return `${hex}${hex[6]}`;
		case 8:
			// Valid 8-digit hex is RRGGBBAA
			return hex;
		default:
			return hex.slice(0, 8);
	}
}

function parsePercent(raw: string): number {
	return raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
}

function hexToOklchState(rawHex: string): OklchState {
	const hex = normalizeHexToRgba8(rawHex);
	const parsed = rgbToOklch(
		parseInt(hex.slice(0, 2), 16),
		parseInt(hex.slice(2, 4), 16),
		parseInt(hex.slice(4, 6), 16),
	);

	return { ...parsed, a: parseInt(hex.slice(6, 8), 16) / 255 };
}

export function parseColor(value: string): OklchState {
	const fallback: OklchState = { L: 0.7, C: 0.15, H: 280, a: 1 };
	if (!value.trim()) {
		return fallback;
	}
	const source = value.trim();
	let match = source.match(/^#([0-9a-f]*)$/i);
	if (match) {
		return hexToOklchState(match[1]);
	}

	const namedHex = NAMED_COLORS[source.toLowerCase()];
	if (namedHex) {
		return hexToOklchState(namedHex);
	}

	match = source.match(/oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)\s*(?:\/\s*([0-9.]+%?))?\s*\)/i);
	if (match) {
		const a = match[4] ? parsePercent(match[4]) : 1;
		return {
			L: clamp(parsePercent(match[1]), 0, 1),
			C: Math.max(0, parseFloat(match[2]) || 0),
			H: (((parseFloat(match[3]) || 0) % 360) + 360) % 360,
			a: clamp(a, 0, 1),
		};
	}

	match = source.match(/rgba?\(\s*([0-9.]+)[ ,]+([0-9.]+)[ ,]+([0-9.]+)\s*(?:[,/]\s*([0-9.]+%?))?\s*\)/i);
	if (match) {
		const parsed = rgbToOklch(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
		const alpha = match[4] ? parsePercent(match[4]) : 1;
		return { ...parsed, a: clamp(alpha, 0, 1) };
	}

	return fallback;
}

function toHexPart(value: number): string {
	return value.toString(16).padStart(2, "0");
}

export function formatColor(state: OklchState, preferredFormat: "hex" | "oklch" | "rgb" | "hsl" = "oklch"): string {
	const rgb = oklchToRgb(state);
	if (rgb.inGamut) {
		if (preferredFormat === "hex") {
			const base = `#${toHexPart(rgb.r)}${toHexPart(rgb.g)}${toHexPart(rgb.b)}`;
			if (state.a >= 0.999) {
				return base;
			}
			return `${base}${toHexPart(Math.round(state.a * 255))}`;
		}
		if (preferredFormat === "rgb") {
			const base = `${rgb.r} ${rgb.g} ${rgb.b}`;
			if (state.a >= 0.999) {
				return `rgb(${base})`;
			}
			return `rgb(${base} / ${state.a.toFixed(2)})`;
		}
		if (preferredFormat === "hsl") {
			const r = rgb.r / 255;
			const g = rgb.g / 255;
			const b = rgb.b / 255;
			const max = Math.max(r, g, b);
			const min = Math.min(r, g, b);
			let h = 0;
			let s = 0;
			const l = (max + min) / 2;
			if (max !== min) {
				const d = max - min;
				s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
				switch (max) {
					case r:
						h = (g - b) / d + (g < b ? 6 : 0);
						break;
					case g:
						h = (b - r) / d + 2;
						break;
					case b:
						h = (r - g) / d + 4;
						break;
				}
				h /= 6;
			}
			const base = `${(h * 360).toFixed(2)} ${(s * 100).toFixed(2)}% ${(l * 100).toFixed(2)}%`;
			if (state.a >= 0.999) {
				return `hsl(${base})`;
			}
			return `hsl(${base} / ${state.a.toFixed(2)})`;
		}
	}
	const L = +state.L.toFixed(4);
	const C = +state.C.toFixed(4);
	const H = +state.H.toFixed(2);
	const base = `${L} ${C} ${H}`;
	if (state.a >= 0.999) {
		return `oklch(${base})`;
	}
	return `oklch(${base} / ${state.a.toFixed(2)})`;
}

export function cssOfDisplayP3(state: OklchState): string {
	const info = oklchGamutInfo(state);
	if (state.a >= 0.999) {
		return `color(display-p3 ${info.p3.r.toFixed(5)} ${info.p3.g.toFixed(5)} ${info.p3.b.toFixed(5)})`;
	}
	return `color(display-p3 ${info.p3.r.toFixed(5)} ${info.p3.g.toFixed(5)} ${info.p3.b.toFixed(5)} / ${state.a.toFixed(3)})`;
}
