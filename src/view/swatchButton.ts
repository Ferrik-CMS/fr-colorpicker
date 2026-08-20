export interface SwatchButton {
	element: HTMLButtonElement;
	setPreview(cssGradient: string): void;
	setDisabled(disabled: boolean): void;
}

/**
 * Checkerboard-backed preview swatch, reused for both the closed-state
 * trigger button and the small mirror swatch in the popover's header.
 */
export function createSwatchButton(type: "button" | "submit"): SwatchButton {
	const button = document.createElement("button");
	button.type = type;
	button.className = "swatch";

	const fill = document.createElement("span");
	fill.className = "swatch-fill";
	button.appendChild(fill);

	return {
		element: button,
		setPreview(cssGradient: string) {
			fill.style.background = cssGradient;
		},
		setDisabled(disabled: boolean) {
			button.disabled = disabled;
		},
	};
}
