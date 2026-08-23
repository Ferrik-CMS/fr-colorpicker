export interface Labels {
	heading: string;
	close: string;
	hue: string;
	lightness: string;
	chroma: string;
	alpha: string;
	value: string;
	accept: string;
}

export const DEFAULT_LABELS: Labels = {
	heading: "FR Colour picker",
	close: "Close",
	hue: "Hue",
	lightness: "Lightness",
	chroma: "Chroma",
	alpha: "Opacity",
	value: "Value",
	accept: "Accept",
};

const ATTRIBUTE_BY_KEY: Record<keyof Labels, string> = {
	heading: "label-heading",
	close: "label-close",
	hue: "label-hue",
	lightness: "label-lightness",
	chroma: "label-chroma",
	alpha: "label-alpha",
	value: "label-value",
	accept: "label-accept",
};

export const LABEL_ATTRIBUTES: readonly string[] = Object.values(ATTRIBUTE_BY_KEY);

/** Reads `label-*` attribute overrides off `el`, falling back to DEFAULT_LABELS for any unset (or empty) attribute. */
export function resolveLabels(el: Element): Labels {
	const out = { ...DEFAULT_LABELS };
	for (const key of Object.keys(DEFAULT_LABELS) as (keyof Labels)[]) {
		const value = el.getAttribute(ATTRIBUTE_BY_KEY[key]);
		if (value) {
			out[key] = value;
		}
	}
	return out;
}
