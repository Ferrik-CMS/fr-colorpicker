import { FrColorPickerElement } from "./element";

export type { OklchState } from "./color/oklchColor";
export { FrColorPickerElement } from "./element";
export type { Labels } from "./labels";
export type { ColorSpace } from "./types";

if (!customElements.get("fr-colorpicker")) {
	customElements.define("fr-colorpicker", FrColorPickerElement);
}

declare global {
	interface HTMLElementTagNameMap {
		"fr-colorpicker": FrColorPickerElement;
	}
}
