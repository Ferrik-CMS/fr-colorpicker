import { formatColor, parseColor } from "./color/oklchColor";
import { DEFAULT_LABELS, LABEL_ATTRIBUTES, type Labels, resolveLabels } from "./labels";
import { type ColorPickerAction, type ColorPickerState, colorReducer } from "./state/colorReducer";
import type { ColorSpace } from "./types";
import { createPopover, type Popover } from "./view/popover";
import { computeOpenDirection } from "./view/positioning";
import cssText from "./view/styles.css?inline";
import { createSwatchButton, type SwatchButton } from "./view/swatchButton";

const DEFAULT_DEFAULT_VALUE = "#f000f0";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

const CORE_ATTRIBUTES = ["value", "default-value", "name", "disabled", "no-alpha", "color-space"] as const;

/**
 * A dependency-free, form-associated OKLCH color-picker Web Component.
 * Ported from OklchColorAtom.tsx -- see the individual modules under
 * `state/`, `render/`, and `view/` for the ported pieces. This class only
 * wires them together: it owns the shadow DOM, the attribute/property
 * surface, ElementInternals form participation, and translates the
 * centralized reducer's transitions into `input`/`change` events.
 */
export class FrColorPickerElement extends HTMLElement {
	static formAssociated = true;

	static get observedAttributes(): string[] {
		return [...CORE_ATTRIBUTES, ...LABEL_ATTRIBUTES];
	}

	#internals: ElementInternals;
	#state: ColorPickerState;
	/** The externally-visible committed value when the dialog is closed (see the `value` getter). */
	#committedValue: string;
	#trigger: SwatchButton;
	#popover: Popover;

	constructor() {
		super();
		this.#internals = this.attachInternals();

		const shadow = this.attachShadow({ mode: "open" });
		shadow.adoptedStyleSheets = [sheet];

		this.#trigger = createSwatchButton("button");
		this.#trigger.element.addEventListener("click", () => this.#handleTriggerClick());
		shadow.appendChild(this.#trigger.element);

		this.#popover = createPopover({
			onChange: (next) => this.#dispatch({ type: "update", nextValue: next }),
			onCommit: () => this.#dispatch({ type: "commit" }),
			onAccept: () => this.#dispatch({ type: "accept" }),
			onCancel: () => this.#dispatch({ type: "cancel" }),
			onValueInput: (raw) => {
				if (raw.toLowerCase() === "transparent") {
					// "transparent" is a special CSS keyword handled in a demultiplied-alpha way, matching the source.
					this.#dispatch({ type: "update", nextValue: { a: 0 } });
				} else {
					this.#dispatch({ type: "update", nextValue: parseColor(raw) });
				}
			},
		});
		shadow.appendChild(this.#popover.dialog);

		this.#committedValue = DEFAULT_DEFAULT_VALUE;
		this.#state = { dialog: null, defaultValue: DEFAULT_DEFAULT_VALUE };
	}

	connectedCallback(): void {
		this.#applyValueAttribute();
		this.#state = { ...this.#state, defaultValue: this.defaultValue };
		this.#popover.setLabels(resolveLabels(this));
		this.#internals.setFormValue(this.value);
		this.#render();
	}

	disconnectedCallback(): void {
		this.#popover.destroy();
	}

	attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null): void {
		switch (name) {
			case "value":
				this.#applyValueAttribute();
				this.#internals.setFormValue(this.value);
				this.#render();
				break;
			case "default-value":
				this.#state = { ...this.#state, defaultValue: this.defaultValue };
				this.#applyValueAttribute();
				this.#internals.setFormValue(this.value);
				this.#render();
				break;
			case "disabled": {
				const isDisabled = this.disabled;
				if (isDisabled && this.#state.dialog) {
					this.#dispatch({ type: "cancel" });
				}
				this.#render();
				break;
			}
			case "no-alpha":
			case "color-space":
				this.#render();
				break;
			case "name":
				// No extra handling needed: form submission reads the `name`
				// content attribute directly via ElementInternals.
				break;
			default:
				if ((LABEL_ATTRIBUTES as readonly string[]).includes(name)) {
					this.#popover.setLabels(resolveLabels(this));
				}
		}
	}

	formResetCallback(): void {
		this.#state = { dialog: null, defaultValue: this.defaultValue };
		this.#committedValue = this.defaultValue;
		this.#popover.close();
		this.#internals.setFormValue(this.value);
		this.#render();
	}

	formDisabledCallback(disabled: boolean): void {
		this.disabled = disabled;
	}

	/** The live formatted color while the dialog is open, otherwise the last committed value. */
	get value(): string {
		return this.#state.dialog ? formatColor(this.#state.dialog.currentValue) : this.#committedValue;
	}
	set value(next: string) {
		this.#committedValue = next;
		this.#internals.setFormValue(this.value);
		this.#render();
	}

	get defaultValue(): string {
		return this.getAttribute("default-value") || DEFAULT_DEFAULT_VALUE;
	}
	set defaultValue(next: string) {
		this.setAttribute("default-value", next);
	}

	get name(): string {
		return this.getAttribute("name") ?? "";
	}
	set name(next: string) {
		this.setAttribute("name", next);
	}

	get disabled(): boolean {
		return this.hasAttribute("disabled");
	}
	set disabled(next: boolean) {
		this.toggleAttribute("disabled", next);
	}

	get noAlpha(): boolean {
		return this.hasAttribute("no-alpha");
	}
	set noAlpha(next: boolean) {
		this.toggleAttribute("no-alpha", next);
	}

	get colorSpace(): ColorSpace {
		const raw = this.getAttribute("color-space");
		return raw === "srgb" || raw === "display-p3" || raw === "rec2020" || raw === "any" ? raw : "any";
	}
	set colorSpace(next: ColorSpace) {
		this.setAttribute("color-space", next);
	}

	get labelHeading(): string {
		return this.#labelAttribute("heading");
	}
	set labelHeading(next: string) {
		this.#setLabelAttribute("heading", next);
	}
	get labelClose(): string {
		return this.#labelAttribute("close");
	}
	set labelClose(next: string) {
		this.#setLabelAttribute("close", next);
	}
	get labelHue(): string {
		return this.#labelAttribute("hue");
	}
	set labelHue(next: string) {
		this.#setLabelAttribute("hue", next);
	}
	get labelLightness(): string {
		return this.#labelAttribute("lightness");
	}
	set labelLightness(next: string) {
		this.#setLabelAttribute("lightness", next);
	}
	get labelChroma(): string {
		return this.#labelAttribute("chroma");
	}
	set labelChroma(next: string) {
		this.#setLabelAttribute("chroma", next);
	}
	get labelAlpha(): string {
		return this.#labelAttribute("alpha");
	}
	set labelAlpha(next: string) {
		this.#setLabelAttribute("alpha", next);
	}
	get labelValue(): string {
		return this.#labelAttribute("value");
	}
	set labelValue(next: string) {
		this.#setLabelAttribute("value", next);
	}
	get labelAccept(): string {
		return this.#labelAttribute("accept");
	}
	set labelAccept(next: string) {
		this.#setLabelAttribute("accept", next);
	}

	#labelAttribute(key: keyof Labels): string {
		const labelAttr = this.getAttribute(`label-${key}`);
		if (labelAttr !== null) {
			return labelAttr;
		}
		const compoundLabelAttr = this.getAttribute(`label`);
		if (compoundLabelAttr !== null) {
			const decodedJson = JSON.parse(compoundLabelAttr) as Partial<Labels>;
			if (decodedJson[key] !== undefined) {
				return decodedJson[key];
			}
		}
		return DEFAULT_LABELS[key];
	}
	#setLabelAttribute(key: keyof Labels, next: string): void {
		this.setAttribute(`label-${key}`, next);
	}

	#applyValueAttribute(): void {
		this.#committedValue = this.hasAttribute("value") ? (this.getAttribute("value") ?? "") : this.defaultValue;
	}

	#handleTriggerClick(): void {
		if (this.disabled) {
			return;
		}
		const rect = this.#trigger.element.getBoundingClientRect();
		this.#dispatch({
			type: "open",
			value: this.value,
			colorSpace: this.colorSpace,
			offset: computeOpenDirection(rect),
		});
	}

	/**
	 * Dispatches into the centralized reducer, then performs the side effects
	 * the source's reducer used to perform inline (`state.onInput`/
	 * `state.onChange`) by diffing prev/next state -- see colorReducer.ts's
	 * doc comment for why this moved out of the reducer itself.
	 */
	#dispatch(action: ColorPickerAction): void {
		const prev = this.#state;
		const next = colorReducer(prev, action);
		if (next === prev) {
			return;
		}
		this.#state = next;

		if (action.type === "accept" && prev.dialog) {
			this.#committedValue = formatColor(prev.dialog.currentValue, this.colorSpace === "srgb" ? "hex" : "oklch");
			this.#internals.setFormValue(this.value);
			this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
		} else if (action.type === "cancel" && prev.dialog) {
			this.#committedValue = prev.dialog.initial;
			this.#internals.setFormValue(this.value);
			this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
		} else if (action.type === "update" && next.dialog) {
			this.#internals.setFormValue(this.value);
			this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
		}

		this.#render();
	}

	#render(): void {
		const displayValue = this.value;
		const preview = `linear-gradient(oklch(from ${displayValue} l c h/100%) 50%, ${displayValue} 50%)`;
		this.#trigger.setPreview(preview);
		this.#trigger.setDisabled(this.disabled);

		if (this.#state.dialog) {
			this.#popover.open(this.#state.dialog.openDirection);
			this.#popover.update({
				currentValue: this.#state.dialog.currentValue,
				colorSpace: this.colorSpace,
				noAlpha: this.noAlpha,
				preview,
			});
		} else {
			this.#popover.close();
		}
	}
}
