import { describe, expect, it } from "vitest";
import { parseColor } from "./oklchColor";

describe("parseColor named colors", () => {
	it("parses a basic keyword the same as its hex equivalent", () => {
		expect(parseColor("red")).toEqual(parseColor("#ff0000"));
	});

	it("is case-insensitive", () => {
		expect(parseColor("RebeccaPurple")).toEqual(parseColor("#663399"));
	});

	it("parses 'transparent' as fully transparent black", () => {
		expect(parseColor("transparent")).toEqual({ ...parseColor("#000000"), a: 0 });
	});

	it("resolves aliased keywords to the same color", () => {
		expect(parseColor("cyan")).toEqual(parseColor("aqua"));
		expect(parseColor("grey")).toEqual(parseColor("gray"));
	});

	it("falls back to the default for an unknown keyword", () => {
		expect(parseColor("notacolor")).toEqual({ L: 0.7, C: 0.15, H: 280, a: 1 });
	});
});
