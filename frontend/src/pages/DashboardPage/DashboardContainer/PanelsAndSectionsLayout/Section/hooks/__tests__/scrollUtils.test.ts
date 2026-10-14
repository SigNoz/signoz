import { getScrollParent } from '../scrollUtils';

describe('getScrollParent', () => {
	it('picks the OverlayScrollbars viewport before it has marked itself scrollable', () => {
		const viewport = document.createElement('div');
		viewport.setAttribute('data-overlayscrollbars-viewport', '');
		const child = document.createElement('div');
		viewport.appendChild(child);
		document.body.appendChild(viewport);

		expect(getScrollParent(child)).toBe(viewport);

		viewport.remove();
	});

	it('falls back to the document scroller', () => {
		const child = document.createElement('div');
		document.body.appendChild(child);

		expect(getScrollParent(child)).toBe(
			document.scrollingElement ?? document.documentElement,
		);

		child.remove();
	});
});
