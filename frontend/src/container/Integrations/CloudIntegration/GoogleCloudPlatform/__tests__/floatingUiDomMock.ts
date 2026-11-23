/**
 * jsdom has no layout, and Floating UI's getComputedStyle walk over every
 * popover ancestor costs ~1 s per open here, enough to time out under load.
 */
export const floatingUiDomMock = (): Record<string, unknown> => ({
	...jest.requireActual('@floating-ui/dom'),
	autoUpdate: (): (() => void) => (): void => {},
	computePosition: (
		_reference: unknown,
		_floating: unknown,
		{ placement = 'bottom', strategy = 'absolute' } = {},
	): Promise<unknown> =>
		Promise.resolve({ x: 0, y: 0, placement, strategy, middlewareData: {} }),
});
