const SVG_NS = "http://www.w3.org/2000/svg";

function createIcon(pathD: string, title: string): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("width", "24");
	svg.setAttribute("height", "24");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "currentColor");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");
	svg.setAttribute("stroke-width", "1.8");
	svg.setAttribute("data-attribution", "cc0-icons");

	const titleEl = document.createElementNS(SVG_NS, "title");
	titleEl.textContent = title;
	svg.appendChild(titleEl);

	const path = document.createElementNS(SVG_NS, "path");
	path.setAttribute("d", pathD);
	svg.appendChild(path);

	return svg;
}

export function setIconTitle(svg: SVGSVGElement, title: string): void {
	const titleEl = svg.querySelector("title");
	if (titleEl) {
		titleEl.textContent = title;
	}
}

export function createCloseIcon(title: string): SVGSVGElement {
	return createIcon("M18.364 5.636 5.636 18.364m0-12.728 12.728 12.728", title);
}

export function createAcceptIcon(title: string): SVGSVGElement {
	return createIcon("M20 6 9.5 18 4 12", title);
}
