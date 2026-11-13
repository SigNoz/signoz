import type { CaretBox } from './types';

// Everything that decides where a line wraps.
const MIRRORED_STYLES = [
	'border-top-width',
	'border-right-width',
	'border-bottom-width',
	'border-left-width',
	'border-style',
	'padding-top',
	'padding-right',
	'padding-bottom',
	'padding-left',
	'font-family',
	'font-size',
	'font-style',
	'font-variant',
	'font-weight',
	'font-stretch',
	'font-feature-settings',
	'font-variation-settings',
	'font-kerning',
	'line-height',
	'letter-spacing',
	'word-spacing',
	'text-align',
	'text-indent',
	'text-transform',
	'tab-size',
	'white-space',
	'word-break',
	'overflow-wrap',
];

// Caret box in the textarea's border box, measured on an off-screen copy of its text.
export function getCaretCoordinates(
	textarea: HTMLTextAreaElement,
	position: number,
): CaretBox {
	const computed = getComputedStyle(textarea);
	const borderTop = parseFloat(computed.borderTopWidth) || 0;
	const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
	const borderRight = parseFloat(computed.borderRightWidth) || 0;

	const mirror = document.createElement('div');
	MIRRORED_STYLES.forEach((name) => {
		mirror.style.setProperty(name, computed.getPropertyValue(name));
	});
	Object.assign(mirror.style, {
		position: 'absolute',
		top: '0',
		left: '-9999px',
		visibility: 'hidden',
		overflow: 'hidden',
		boxSizing: 'border-box',
		width: `${textarea.clientWidth + borderLeft + borderRight}px`,
	});

	mirror.textContent = textarea.value.slice(0, position);
	const marker = document.createElement('span');
	marker.textContent = textarea.value.slice(position) || '.';
	mirror.appendChild(marker);
	document.body.appendChild(mirror);

	const box = {
		left: marker.offsetLeft + borderLeft,
		top: marker.offsetTop + borderTop,
		height:
			marker.getClientRects()[0]?.height || parseFloat(computed.lineHeight) || 0,
	};
	mirror.remove();
	return box;
}
