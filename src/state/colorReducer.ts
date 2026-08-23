import assertNever from "../color/assertNever";
import { clamp, type OklchState, oklchGamutInfo, parseColor } from "../color/oklchColor";
import type { ColorSpace, OpenDirection } from "../types";

export type SetOklchStateAction = Partial<OklchState> | ((prev: OklchState) => Partial<OklchState>);
export type DispatchOklchState = (value: SetOklchStateAction) => void;

let snapOffsetCache: WeakRef<[number, number][]> | null = null;
/**
 * A spiral search order (closest offsets first) used by `makeColourInBounds` to
 * find the nearest in-gamut [L, C] without having to search the whole plane.
 * Ported from OklchColorAtom.tsx; the original had a debug `console.log` here
 * on every cache rebuild, dropped as a leftover, not part of the algorithm.
 */
function getSnapOffsets(): [number, number][] {
	const fromCache = snapOffsetCache?.deref();
	if (fromCache) {
		return fromCache;
	}

	const offsets: [number, number, number][] = [];
	for (let x = 1; x < 20; x++) for (let y = 0; y <= x; y++) offsets.push([x / 1000, y / 1000, x ** 2 + y ** 2]);
	offsets.sort(([, , a], [, , b]) => a - b);

	const res: [number, number][] = [];
	let lastX = 0;
	let lastY = 0;
	function pushAbs(x: number, y: number) {
		res.push([x - lastX, y - lastY]);
		lastX = x;
		lastY = y;
	}
	for (const [oX, oY] of offsets) {
		pushAbs(oX, oY);
		pushAbs(oX, -oY);
		pushAbs(-oX, oY);
		pushAbs(-oX, -oY);
	}
	pushAbs(0, 0);
	snapOffsetCache = new WeakRef(res);
	return res;
}

/**
 * Snaps an out-of-gamut OKLCH color back into `targetColorSpace`'s gamut: first
 * via the small spiral search above, then (if `adjustLightnessInsteadOfChroma`)
 * a linear scan along the current chroma line for a valid lightness, then a
 * bisection-style clip of chroma toward C=0 at the same lightness.
 */
function makeColourInBounds(
	sNew: OklchState,
	targetColorSpace: ColorSpace,
	adjustLightnessInsteadOfChroma: boolean,
): OklchState {
	const key = targetColorSpace === "srgb" ? "inSrgb" : "inP3";
	if (oklchGamutInfo(sNew)[key]) {
		return sNew;
	}
	for (const offset of getSnapOffsets()) {
		sNew.L += offset[0];
		sNew.C += offset[1];
		if (oklchGamutInfo(sNew)[key]) {
			return sNew;
		}
	}
	if (adjustLightnessInsteadOfChroma) {
		const oldL = sNew.L;

		// Do a linear scan of the current chroma line to find the best lightness value
		for (let i = 0; i < 1; i += 0.001) {
			sNew.L = oldL + i;
			if (oklchGamutInfo(sNew)[key]) return sNew;
			sNew.L = oldL - i;
			if (oklchGamutInfo(sNew)[key]) return sNew;
		}
		// No match, clip chroma instead
		sNew.L = oldL;
	}
	const sOld: OklchState = { L: sNew.L, C: 0, H: sNew.H, a: 1 };

	if (oklchGamutInfo(sOld)[key]) {
		for (let i = 0; i < 10; i++) {
			const sMid = {
				L: Math.round((sNew.L + sOld.L) * 500) / 1000,
				C: Math.round((sNew.C + sOld.C) * 500) / 1000,
				H: sNew.H,
				a: 1,
			};
			if (sMid.L === sOld.L && sMid.C === sOld.C) {
				return sOld;
			}
			if (oklchGamutInfo(sMid)[key]) {
				sOld.L = sMid.L;
				sOld.C = sMid.C;
			} else {
				sNew.L = sMid.L;
				sNew.C = sMid.C;
			}
		}
	}
	return sOld;
}

export interface DialogState {
	openDirection: OpenDirection;
	initial: string;
	stableValue: OklchState;
	currentValue: OklchState;
	colorSpace: ColorSpace;
}

export interface ColorPickerState {
	dialog: DialogState | null;
	defaultValue: string;
}

export type ColorPickerAction =
	| { type: "open"; colorSpace: ColorSpace; value: string | undefined; offset: OpenDirection | undefined }
	| { type: "accept" }
	| { type: "cancel" }
	| { type: "update"; nextValue: SetOklchStateAction }
	| { type: "commit" };

/**
 * The single centralized state machine for the color picker dialog. Ported
 * from OklchColorAtom.tsx's useReducer with behavior-preserving fidelity
 * (same clamping, gamut-snap search, and open/update/commit/accept/cancel
 * transitions) except: this reducer is pure. The source's reducer called
 * `state.onInput(...)`/`state.onChange(...)` as embedded side effects (needed
 * there only to work around React's stale-closure-across-re-renders problem
 * for props, which doesn't apply to a plain class instance). Here, the caller
 * (FrColorPickerElement's dispatch wrapper) diffs prev/next state itself to
 * decide when to fire `input`/`change` events, using `dialog.initial` (on
 * cancel) or `dialog.currentValue` (on accept) from the *previous* state.
 */
export function colorReducer(state: ColorPickerState, action: ColorPickerAction): ColorPickerState {
	switch (action.type) {
		case "open": {
			const value = action.value || state.defaultValue;
			const parsed = parseColor(value);
			return {
				...state,
				dialog: {
					openDirection: action.offset ?? { left: 0, top: 0 },
					initial: value,
					stableValue: parsed,
					currentValue: parsed,
					colorSpace: action.colorSpace,
				},
			};
		}
		case "accept":
			if (!state.dialog) return state;
			return { ...state, dialog: null };
		case "cancel":
			if (!state.dialog) return state;
			return { ...state, dialog: null };
		case "update": {
			if (!state.dialog) return state;
			const old = state.dialog.stableValue;
			const resolved = {
				...old,
				...(typeof action.nextValue === "function" ? action.nextValue(state.dialog.stableValue) : action.nextValue),
			};
			const clamped = {
				L: clamp(resolved.L, 0, 1),
				C: Math.max(0, resolved.C),
				H: ((resolved.H % 360) + 360) % 360,
				a: clamp(resolved.a, 0, 1),
			};
			const adjustLightnessInsteadOfChroma = clamped.L === old.L && clamped.C !== old.C;
			// "any" is not "unconstrained" - makeColourInBounds treats any
			// non-"srgb" target as the P3 gamut check. Unlike the original React
			// source (which always snapped against "any"/P3 regardless of the
			// public colorSpace prop), this uses the dialog's actual colorSpace,
			// so color-space="srgb" genuinely constrains interactive edits to the
			// sRGB gamut, not just which regions the canvases paint as in-bounds.
			const normalized = makeColourInBounds(clamped, state.dialog.colorSpace, adjustLightnessInsteadOfChroma);
			if (
				state.dialog.currentValue.L === normalized.L &&
				state.dialog.currentValue.C === normalized.C &&
				state.dialog.currentValue.H === normalized.H &&
				state.dialog.currentValue.a === normalized.a
			) {
				return state;
			}
			return {
				...state,
				dialog: {
					...state.dialog,
					currentValue: normalized,
				},
			};
		}
		case "commit":
			if (!state.dialog) return state;
			return {
				...state,
				dialog: {
					...state.dialog,
					stableValue: state.dialog.currentValue,
				},
			};
		default:
			return assertNever(action);
	}
}
