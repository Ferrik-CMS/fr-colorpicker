import type { OpenDirection } from "../types";

export function computeOpenDirection(rect: DOMRect): OpenDirection {
	const ourWidth = 348;
	const ourHeight = 550;

	let left = rect.left - 15;
	if (left < 0) {
		left = 0;
	}
	if (left + ourWidth > window.innerWidth) {
		left = window.innerWidth - ourWidth;
	}

	let top = rect.top - 15;
	if (top < 0) {
		top = 0;
	}
	if (top + ourHeight > window.innerHeight) {
		top = window.innerHeight - ourHeight;
	}

	return { left, top };
}
