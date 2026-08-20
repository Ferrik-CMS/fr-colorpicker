import { createAcceptIcon, setIconTitle } from "./icons";

export interface ValueRowOptions {
	onChange: (raw: string) => void;
	onCommit: () => void;
}

export interface ValueRow {
	element: HTMLDivElement;
	input: HTMLInputElement;
	setLabels(valueLabel: string, acceptLabel: string): void;
	update(displayValue: string): void;
	resetBuffer(): void;
	focusAndSelect(): void;
}

let idCounter = 0;

/**
 * Ported from the bottom "Value" row of OklchColorAtom.tsx, including
 * TextInputAtom's local typed-value buffer: while focused, the input shows
 * exactly what was typed (not the reformatted committed value) so the user
 * isn't fought mid-keystroke; on blur the buffer clears and the input snaps
 * back to the last committed display value. This is the one deliberate
 * local-state exception in the port -- everywhere else, view modules only
 * patch DOM from the centralized reducer state.
 */
export function createValueRow(options: ValueRowOptions): ValueRow {
	const { onChange, onCommit } = options;
	const inputId = `frcp-value-${idCounter++}`;

	const container = document.createElement("div");
	container.className = "row value-row";

	const label = document.createElement("label");
	label.htmlFor = inputId;
	label.className = "row-label";
	container.appendChild(label);

	const input = document.createElement("input");
	input.type = "text";
	input.id = inputId;
	input.className = "field row-input";
	container.appendChild(input);

	const acceptButton = document.createElement("button");
	acceptButton.type = "submit";
	acceptButton.className = "icon-btn";
	const acceptIcon = createAcceptIcon("Accept");
	acceptButton.appendChild(acceptIcon);
	container.appendChild(acceptButton);

	let typedValue: string | null = null;
	let latestDisplayValue = "";

	input.addEventListener("input", () => {
		typedValue = input.value;
		onChange(input.value);
	});
	input.addEventListener("focus", () => {
		input.select();
	});
	input.addEventListener("blur", () => {
		// Matches TextInputAtom's order: caller's onBlur (here, onCommit) runs
		// before the typed buffer is cleared.
		onCommit();
		typedValue = null;
		input.value = latestDisplayValue;
	});

	return {
		element: container,
		input,
		setLabels(valueLabel, acceptLabel) {
			label.textContent = valueLabel;
			setIconTitle(acceptIcon, acceptLabel);
		},
		update(displayValue) {
			latestDisplayValue = displayValue;
			input.value = typedValue ?? displayValue;
		},
		resetBuffer() {
			typedValue = null;
		},
		focusAndSelect() {
			input.focus();
			input.select();
		},
	};
}
