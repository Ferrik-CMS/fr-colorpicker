import { describe, expect, it } from "vitest";
import { oklchGamutInfo, parseColor } from "../color/oklchColor";
import { type ColorPickerState, colorReducer } from "./colorReducer";

const DEFAULT_VALUE = "oklch(0.5382 0.2 0 / 1)";

function openedState(value: string): ColorPickerState {
	return colorReducer(
		{ dialog: null, defaultValue: DEFAULT_VALUE },
		{ type: "open", value, offset: { left: 10, top: 20 } },
	);
}

describe("colorReducer: open", () => {
	it("seeds the dialog by parsing the given value", () => {
		const state = openedState("oklch(0.5 0.1 200 / 1)");
		expect(state.dialog?.initial).toBe("oklch(0.5 0.1 200 / 1)");
		expect(state.dialog?.stableValue).toEqual({ L: 0.5, C: 0.1, H: 200, a: 1 });
		expect(state.dialog?.currentValue).toEqual(state.dialog?.stableValue);
		expect(state.dialog?.openDirection).toEqual({ left: 10, top: 20 });
	});

	it("falls back to defaultValue when value is falsy, and {left:0,top:0} when offset is undefined", () => {
		const initial: ColorPickerState = { dialog: null, defaultValue: DEFAULT_VALUE };
		const state = colorReducer(initial, { type: "open", value: undefined, offset: undefined });
		expect(state.dialog?.initial).toBe(DEFAULT_VALUE);
		expect(state.dialog?.openDirection).toEqual({ left: 0, top: 0 });
	});
});

describe("colorReducer: update", () => {
	it("clamps L into [0,1], floors C at 0, wraps H into [0,360), and clamps a into [0,1]", () => {
		const opened = openedState("oklch(0.5 0.1 200 / 1)");
		const next = colorReducer(opened, { type: "update", nextValue: { L: 1.5, C: -1, H: 400, a: 2 } });
		// C floors to 0 (achromatic), which is always in-gamut, so the result is exact.
		expect(next.dialog?.currentValue).toEqual({ L: 1, C: 0, H: 40, a: 1 });
	});

	it("is a no-op (returns the same state reference) when the normalized result doesn't change", () => {
		const opened = openedState("oklch(0.5 0.1 200 / 1)");
		const next = colorReducer(opened, { type: "update", nextValue: {} });
		expect(next).toBe(opened);
	});

	it("adjusts lightness instead of clipping chroma when only chroma is pushed out of gamut", () => {
		// At H=260, C=0.15 is only in the P3 gamut for L roughly within [0.30, 0.73].
		const opened = openedState("oklch(0.9 0.05 260 / 1)");
		const next = colorReducer(opened, { type: "update", nextValue: { C: 0.15 } });
		const result = next.dialog?.currentValue;
		if (!result) throw new Error("expected an open dialog");
		expect(result.C).toBeCloseTo(0.15, 5); // chroma preserved exactly, not clipped down
		expect(result.L).toBeGreaterThanOrEqual(0.29);
		expect(result.L).toBeLessThanOrEqual(0.74); // lightness moved away from the original 0.9
		expect(oklchGamutInfo(result).inP3).toBe(true);
	});

	it("falls back to clipping chroma toward the gamut boundary when lightness can't be adjusted (both L and C change)", () => {
		const opened = openedState("oklch(0.5 0.1 0 / 1)");
		// Changing L too means adjustLightnessInsteadOfChroma is false, so an
		// extreme chroma request must fall back to the bisection chroma-clip.
		const next = colorReducer(opened, { type: "update", nextValue: { L: 0.4, C: 3 } });
		const result = next.dialog?.currentValue;
		if (!result) throw new Error("expected an open dialog");
		expect(result.L).toBe(0.4);
		expect(result.H).toBe(0);
		expect(result.C).toBeGreaterThan(0);
		expect(result.C).toBeLessThan(3);
		expect(oklchGamutInfo(result).inP3).toBe(true);
	});

	it('treats colorSpace "any" as the P3 gamut check, not unconstrained: a color that is in-P3-but-out-of-sRGB is left untouched', () => {
		const value = "oklch(0.4 0.2 260 / 1)";
		expect(oklchGamutInfo(parseColor(value)).inSrgb).toBe(false);
		expect(oklchGamutInfo(parseColor(value)).inP3).toBe(true);

		const opened = openedState(value);
		const next = colorReducer(opened, { type: "update", nextValue: {} });
		// Same reference confirms makeColourInBounds accepted it via the inP3
		// check alone, without clipping it further toward the sRGB gamut.
		expect(next).toBe(opened);
	});
});

describe("colorReducer: commit", () => {
	it("copies currentValue into stableValue", () => {
		const opened = openedState("oklch(0.5 0.1 200 / 1)");
		const updated = colorReducer(opened, { type: "update", nextValue: { L: 0.6 } });
		const committed = colorReducer(updated, { type: "commit" });
		expect(committed.dialog?.stableValue).toEqual(updated.dialog?.currentValue);
	});

	it("is a no-op when there is no open dialog", () => {
		const closed: ColorPickerState = { dialog: null, defaultValue: DEFAULT_VALUE };
		expect(colorReducer(closed, { type: "commit" })).toBe(closed);
	});
});

describe("colorReducer: accept / cancel", () => {
	it("close an open dialog", () => {
		const opened = openedState("oklch(0.5 0.1 200 / 1)");
		expect(colorReducer(opened, { type: "accept" }).dialog).toBeNull();
		expect(colorReducer(opened, { type: "cancel" }).dialog).toBeNull();
	});

	it("are no-ops (same state reference) when the dialog is already closed", () => {
		const closed: ColorPickerState = { dialog: null, defaultValue: DEFAULT_VALUE };
		expect(colorReducer(closed, { type: "accept" })).toBe(closed);
		expect(colorReducer(closed, { type: "cancel" })).toBe(closed);
	});
});
