import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computeOpenDirection } from "./positioning";

const rect = (left: number, top: number) => ({ left, top }) as DOMRect;

describe("computeOpenDirection", () => {
	let originalWidth: number;
	let originalHeight: number;

	beforeEach(() => {
		originalWidth = window.innerWidth;
		originalHeight = window.innerHeight;
	});

	afterEach(() => {
		Object.defineProperty(window, "innerWidth", { value: originalWidth, configurable: true });
		Object.defineProperty(window, "innerHeight", { value: originalHeight, configurable: true });
	});

	it("offsets 15px up-and-left from the trigger rect when there's room", () => {
		Object.defineProperty(window, "innerWidth", { value: 2000, configurable: true });
		Object.defineProperty(window, "innerHeight", { value: 2000, configurable: true });
		expect(computeOpenDirection(rect(100, 200))).toEqual({ left: 85, top: 184 });
	});

	it("clamps left/top to 0 when the offset would go negative", () => {
		Object.defineProperty(window, "innerWidth", { value: 2000, configurable: true });
		Object.defineProperty(window, "innerHeight", { value: 2000, configurable: true });
		expect(computeOpenDirection(rect(5, 5))).toEqual({ left: 0, top: 0 });
	});

	it("clamps left/top so the popover (348x550) stays within the viewport", () => {
		Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
		Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });
		expect(computeOpenDirection(rect(390, 590))).toEqual({ left: 400 - 348, top: 600 - 550 });
	});
});
