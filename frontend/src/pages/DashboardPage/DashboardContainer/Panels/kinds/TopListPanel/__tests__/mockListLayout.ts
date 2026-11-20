const CONTAINER_HEIGHT = 280;
const CONTAINER_WIDTH = 600;
const ROW_HEIGHT = 28;
const SCROLL_HEIGHT = ROW_HEIGHT * 1000;

const heightOf = (element: Element): number =>
	element.hasAttribute('data-index') ? ROW_HEIGHT : CONTAINER_HEIGHT;

/**
 * jsdom has no layout, so the virtualized list would render no rows. Gives the scroll
 * container and the measured rows (`data-index`) real heights, and makes `scrollTo`
 * move `scrollTop` and fire `scroll` the way a browser does.
 */
export function mockListLayout(): void {
	const originalScrollTo = Object.getOwnPropertyDescriptor(
		Element.prototype,
		'scrollTo',
	);

	beforeEach(() => {
		jest
			.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
			.mockImplementation(function rect(this: HTMLElement): DOMRect {
				const height = heightOf(this);
				return {
					width: CONTAINER_WIDTH,
					height,
					top: 0,
					left: 0,
					bottom: height,
					right: CONTAINER_WIDTH,
					x: 0,
					y: 0,
					toJSON: () => ({}),
				};
			});
		jest
			.spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
			.mockImplementation(function height(this: HTMLElement): number {
				return heightOf(this);
			});
		jest
			.spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
			.mockReturnValue(CONTAINER_WIDTH);
		jest
			.spyOn(Element.prototype, 'clientHeight', 'get')
			.mockReturnValue(CONTAINER_HEIGHT);
		jest
			.spyOn(Element.prototype, 'scrollHeight', 'get')
			.mockReturnValue(SCROLL_HEIGHT);
		Element.prototype.scrollTo = function scrollTo(
			this: Element,
			options?: ScrollToOptions | number,
		): void {
			if (typeof options === 'object' && options.top !== undefined) {
				this.scrollTop = options.top;
				this.dispatchEvent(new Event('scroll'));
			}
		};
	});

	afterEach(() => {
		jest.restoreAllMocks();
		if (originalScrollTo) {
			Object.defineProperty(Element.prototype, 'scrollTo', originalScrollTo);
		} else {
			delete (Element.prototype as Partial<Element>).scrollTo;
		}
	});
}
