import { describe, expect, it } from "vitest";
import { DEFAULT_LABELS, resolveLabels } from "./labels";

describe("resolveLabels", () => {
	it("returns all-English defaults when no label-* attributes are set", () => {
		const el = document.createElement("div");
		expect(resolveLabels(el)).toEqual(DEFAULT_LABELS);
	});

	it("overrides individual labels from their matching label-* attribute", () => {
		const el = document.createElement("div");
		el.setAttribute("label-heading", "FR Kleurkiezer");
		el.setAttribute("label-lightness", "Helderheid");
		const labels = resolveLabels(el);
		expect(labels.heading).toBe("FR Kleurkiezer");
		expect(labels.lightness).toBe("Helderheid");
		// Unset labels stay at their default.
		expect(labels.close).toBe(DEFAULT_LABELS.close);
		expect(labels.hue).toBe(DEFAULT_LABELS.hue);
	});

	it("ignores an empty label-* attribute and falls back to the default", () => {
		const el = document.createElement("div");
		el.setAttribute("label-accept", "");
		expect(resolveLabels(el).accept).toBe(DEFAULT_LABELS.accept);
	});
});
