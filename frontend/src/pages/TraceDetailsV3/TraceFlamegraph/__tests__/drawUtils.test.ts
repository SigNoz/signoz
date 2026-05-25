import { DASHED_BORDER_LINE_DASH, MIN_WIDTH_FOR_NAME } from '../constants';
import type { FlamegraphRowMetrics } from '../utils';
import { getFlamegraphRowMetrics } from '../utils';
import { drawEventDot, drawSpanBar, getEventDotColor } from '../utils';
import { MOCK_SPAN } from './testUtils';

jest.mock('container/TraceDetail/utils', () => ({
	convertTimeToRelevantUnit: (): { time: number; timeUnitName: string } => ({
		time: 50,
		timeUnitName: 'ms',
	}),
}));

/** Minimal 2D context for createStripePattern's internal canvas (jsdom getContext often returns null) */
const mockPatternCanvasCtx = {
	beginPath: jest.fn(),
	moveTo: jest.fn(),
	lineTo: jest.fn(),
	stroke: jest.fn(),
	globalAlpha: 1,
};

const originalCreateElement = document.createElement.bind(document);
document.createElement = function (
	tagName: string,
): ReturnType<typeof originalCreateElement> {
	const el = originalCreateElement(tagName);
	if (tagName.toLowerCase() === 'canvas') {
		(el as HTMLCanvasElement).getContext = (() =>
			mockPatternCanvasCtx as unknown) as HTMLCanvasElement['getContext'];
	}
	return el;
};

function createMockCtx(): jest.Mocked<CanvasRenderingContext2D> {
	return {
		beginPath: jest.fn(),
		roundRect: jest.fn(),
		fill: jest.fn(),
		stroke: jest.fn(),
		save: jest.fn(),
		restore: jest.fn(),
		translate: jest.fn(),
		rotate: jest.fn(),
		fillRect: jest.fn(),
		strokeRect: jest.fn(),
		setLineDash: jest.fn(),
		measureText: jest.fn(
			(text: string) => ({ width: text.length * 6 }) as TextMetrics,
		),
		createPattern: jest.fn(() => ({}) as CanvasPattern),
		clip: jest.fn(),
		rect: jest.fn(),
		fillText: jest.fn(),
		font: '',
		fillStyle: '',
		strokeStyle: '',
		textAlign: '',
		textBaseline: '',
		lineWidth: 0,
		globalAlpha: 1,
	} as unknown as jest.Mocked<CanvasRenderingContext2D>;
}

const METRICS: FlamegraphRowMetrics = getFlamegraphRowMetrics(24);

describe('Canvas Draw Utils', () => {
	describe('drawSpanBar', () => {
		it('draws rect + fill for normal span (no selected/hovered)', () => {
			const ctx = createMockCtx();
			const spanRectsArray: {
				span: typeof MOCK_SPAN;
				x: number;
				y: number;
				width: number;
				height: number;
				level: number;
			}[] = [];

			drawSpanBar({
				ctx,
				span: { ...MOCK_SPAN, event: [] },
				x: 10,
				y: 0,
				width: 100,
				levelIndex: 0,
				spanRectsArray,
				eventRectsArray: [],
				color: '#1890ff',
				isDarkMode: false,
				metrics: METRICS,
			});

			expect(ctx.beginPath).toHaveBeenCalled();
			expect(ctx.roundRect).toHaveBeenCalledWith(10, 1, 100, 22, 2);
			expect(ctx.fill).toHaveBeenCalled();
			expect(ctx.stroke).not.toHaveBeenCalled();
			expect(spanRectsArray).toHaveLength(1);
			expect(spanRectsArray[0]).toMatchObject({
				x: 10,
				y: 1,
				width: 100,
				height: 22,
				level: 0,
			});
		});

		it('uses stripe pattern + dashed stroke + 2px when selected', () => {
			const ctx = createMockCtx();
			const spanRectsArray: {
				span: typeof MOCK_SPAN;
				x: number;
				y: number;
				width: number;
				height: number;
				level: number;
			}[] = [];

			drawSpanBar({
				ctx,
				span: { ...MOCK_SPAN, spanId: 'sel', event: [] },
				x: 20,
				y: 0,
				width: 80,
				levelIndex: 1,
				spanRectsArray,
				eventRectsArray: [],
				color: '#2F80ED',
				isDarkMode: false,
				metrics: METRICS,
				selectedSpanId: 'sel',
			});

			// Selected spans get solid l2-background fill + dashed border
			expect(ctx.fill).toHaveBeenCalled();
			expect(ctx.setLineDash).toHaveBeenCalledWith(DASHED_BORDER_LINE_DASH);
			expect(ctx.strokeStyle).toBe('#2F80ED');
			expect(ctx.lineWidth).toBe(2);
			expect(ctx.stroke).toHaveBeenCalled();
			expect(ctx.setLineDash).toHaveBeenLastCalledWith([]);
		});

		it('uses solid l2-background fill + solid stroke + 1px when hovered (not selected)', () => {
			const ctx = createMockCtx();
			const spanRectsArray: {
				span: typeof MOCK_SPAN;
				x: number;
				y: number;
				width: number;
				height: number;
				level: number;
			}[] = [];

			drawSpanBar({
				ctx,
				span: { ...MOCK_SPAN, spanId: 'hov', event: [] },
				x: 30,
				y: 0,
				width: 60,
				levelIndex: 0,
				spanRectsArray,
				eventRectsArray: [],
				color: '#2F80ED',
				isDarkMode: false,
				metrics: METRICS,
				hoveredSpanId: 'hov',
			});

			expect(ctx.fill).toHaveBeenCalled();
			expect(ctx.setLineDash).not.toHaveBeenCalled();
			expect(ctx.lineWidth).toBe(1);
			expect(ctx.stroke).toHaveBeenCalled();
		});

		it('pushes spanRectsArray with correct dimensions', () => {
			const ctx = createMockCtx();
			const spanRectsArray: {
				span: typeof MOCK_SPAN;
				x: number;
				y: number;
				width: number;
				height: number;
				level: number;
			}[] = [];

			drawSpanBar({
				ctx,
				span: { ...MOCK_SPAN, spanId: 'rect-test', event: [] },
				x: 5,
				y: 24,
				width: 200,
				levelIndex: 2,
				spanRectsArray,
				eventRectsArray: [],
				color: '#000',
				isDarkMode: false,
				metrics: METRICS,
			});

			expect(spanRectsArray[0]).toMatchObject({
				x: 5,
				y: 25,
				width: 200,
				height: 22,
				level: 2,
			});
			expect(spanRectsArray[0].span.spanId).toBe('rect-test');
		});
	});

	describe('drawSpanLabel (via drawSpanBar)', () => {
		it('skips label when width < MIN_WIDTH_FOR_NAME', () => {
			const ctx = createMockCtx();
			const spanRectsArray: {
				span: typeof MOCK_SPAN;
				x: number;
				y: number;
				width: number;
				height: number;
				level: number;
			}[] = [];

			drawSpanBar({
				ctx,
				span: { ...MOCK_SPAN, name: 'long-span-name', event: [] },
				x: 0,
				y: 0,
				width: MIN_WIDTH_FOR_NAME - 1,
				levelIndex: 0,
				spanRectsArray,
				eventRectsArray: [],
				color: '#000',
				isDarkMode: false,
				metrics: METRICS,
			});

			expect(ctx.clip).not.toHaveBeenCalled();
			expect(ctx.fillText).not.toHaveBeenCalled();
		});

		it('draws name only when width >= MIN_WIDTH_FOR_NAME but < MIN_WIDTH_FOR_NAME_AND_DURATION', () => {
			const ctx = createMockCtx();
			ctx.measureText = jest.fn(
				(t: string) => ({ width: t.length * 6 }) as TextMetrics,
			);

			drawSpanBar({
				ctx,
				span: { ...MOCK_SPAN, name: 'foo', event: [] },
				x: 0,
				y: 0,
				width: 50,
				levelIndex: 0,
				spanRectsArray: [],
				eventRectsArray: [],
				color: '#000',
				isDarkMode: false,
				metrics: METRICS,
			});

			expect(ctx.clip).toHaveBeenCalled();
			expect(ctx.fillText).toHaveBeenCalled();
			expect(ctx.textAlign).toBe('left');
		});

		it('draws name + duration when width >= MIN_WIDTH_FOR_NAME_AND_DURATION', () => {
			const ctx = createMockCtx();
			ctx.measureText = jest.fn(
				(t: string) => ({ width: t.length * 6 }) as TextMetrics,
			);

			drawSpanBar({
				ctx,
				span: { ...MOCK_SPAN, name: 'my-span', event: [] },
				x: 0,
				y: 0,
				width: 100,
				levelIndex: 0,
				spanRectsArray: [],
				eventRectsArray: [],
				color: '#000',
				isDarkMode: false,
				metrics: METRICS,
			});

			expect(ctx.fillText).toHaveBeenCalledTimes(2);
			expect(ctx.fillText).toHaveBeenCalledWith(
				'50ms',
				expect.any(Number),
				expect.any(Number),
			);
			expect(ctx.fillText).toHaveBeenCalledWith(
				'my-span',
				expect.any(Number),
				expect.any(Number),
			);
		});
	});

	describe('truncateText (via drawSpanBar)', () => {
		it('uses full text when it fits', () => {
			const ctx = createMockCtx();
			ctx.measureText = jest.fn(
				(t: string) => ({ width: t.length * 4 }) as TextMetrics,
			);

			drawSpanBar({
				ctx,
				span: { ...MOCK_SPAN, name: 'short', event: [] },
				x: 0,
				y: 0,
				width: 100,
				levelIndex: 0,
				spanRectsArray: [],
				eventRectsArray: [],
				color: '#000',
				isDarkMode: false,
				metrics: METRICS,
			});

			expect(ctx.fillText).toHaveBeenCalledWith(
				'short',
				expect.any(Number),
				expect.any(Number),
			);
		});

		it('truncates text when it exceeds available width', () => {
			const ctx = createMockCtx();
			ctx.measureText = jest.fn(
				(t: string) =>
					({
						width: t.includes('...') ? 24 : t.length * 10,
					}) as TextMetrics,
			);

			drawSpanBar({
				ctx,
				span: { ...MOCK_SPAN, name: 'very-long-span-name', event: [] },
				x: 0,
				y: 0,
				width: 50,
				levelIndex: 0,
				spanRectsArray: [],
				eventRectsArray: [],
				color: '#000',
				isDarkMode: false,
				metrics: METRICS,
			});

			const fillTextCalls = (ctx.fillText as jest.Mock).mock.calls;
			const nameArg = fillTextCalls.find((c) => c[0] !== '50ms')?.[0];
			expect(nameArg).toBeDefined();
			expect(nameArg).toMatch(/\.\.\.$/);
		});
	});

	describe('drawEventDot', () => {
		it('uses error styling when isError is true', () => {
			const ctx = createMockCtx();
			const color = getEventDotColor('#000', true, false);

			drawEventDot({
				ctx,
				x: 50,
				y: 11,
				color,
				eventDotSize: 6,
			});

			expect(ctx.save).toHaveBeenCalled();
			expect(ctx.translate).toHaveBeenCalledWith(50, 11);
			expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 4);
			expect(ctx.fillStyle).toBe('rgb(220, 38, 38)');
			expect(ctx.strokeStyle).toBe('rgb(153, 27, 27)');
			expect(ctx.fillRect).toHaveBeenCalledWith(-3, -3, 6, 6);
			expect(ctx.strokeRect).toHaveBeenCalledWith(-3, -3, 6, 6);
			expect(ctx.restore).toHaveBeenCalled();
		});

		it('derives color from span color when isError is false', () => {
			const ctx = createMockCtx();
			const color = getEventDotColor('rgb(100, 200, 150)', false, false);

			drawEventDot({
				ctx,
				x: 0,
				y: 0,
				color,
				eventDotSize: 6,
			});

			// Darkened by 20% for fill
			expect(ctx.fillStyle).toBe('rgb(80, 160, 120)');
			// Darkened by 40% for stroke
			expect(ctx.strokeStyle).toBe('rgb(60, 120, 90)');
		});

		it('uses dark mode colors for error', () => {
			const ctx = createMockCtx();
			const color = getEventDotColor('#000', true, true);

			drawEventDot({
				ctx,
				x: 0,
				y: 0,
				color,
				eventDotSize: 6,
			});

			expect(ctx.fillStyle).toBe('rgb(239, 68, 68)');
			expect(ctx.strokeStyle).toBe('rgb(185, 28, 28)');
		});

		it('falls back to cyan/blue for unparseable span colors', () => {
			const ctx = createMockCtx();
			const color = getEventDotColor('hsl(200, 50%, 50%)', false, false);

			drawEventDot({
				ctx,
				x: 0,
				y: 0,
				color,
				eventDotSize: 6,
			});

			expect(ctx.fillStyle).toBe('rgb(6, 182, 212)');
			expect(ctx.strokeStyle).toBe('rgb(8, 145, 178)');
		});

		it('calls save, translate, rotate, restore', () => {
			const ctx = createMockCtx();
			const color = getEventDotColor('#000', false, false);

			drawEventDot({
				ctx,
				x: 10,
				y: 20,
				color,
				eventDotSize: 4,
			});

			expect(ctx.save).toHaveBeenCalled();
			expect(ctx.translate).toHaveBeenCalledWith(10, 20);
			expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 4);
			expect(ctx.restore).toHaveBeenCalled();
		});
	});

	describe('solid l2-background fill for selected/hovered spans', () => {
		it('uses solid fill for hovered span', () => {
			const ctx = createMockCtx();

			drawSpanBar({
				ctx,
				span: { ...MOCK_SPAN, spanId: 'p', event: [] },
				x: 0,
				y: 0,
				width: MIN_WIDTH_FOR_NAME - 1,
				levelIndex: 0,
				spanRectsArray: [],
				eventRectsArray: [],
				color: '#000',
				isDarkMode: false,
				metrics: METRICS,
				hoveredSpanId: 'p',
			});

			expect(ctx.fill).toHaveBeenCalled();
			expect(ctx.stroke).toHaveBeenCalled();
		});

		it('uses solid fill + dashed border for selected span', () => {
			const ctx = createMockCtx();

			drawSpanBar({
				ctx,
				span: { ...MOCK_SPAN, spanId: 'p', event: [] },
				x: 0,
				y: 0,
				width: MIN_WIDTH_FOR_NAME - 1,
				levelIndex: 0,
				spanRectsArray: [],
				eventRectsArray: [],
				color: '#000',
				isDarkMode: false,
				metrics: METRICS,
				selectedSpanId: 'p',
			});

			expect(ctx.fill).toHaveBeenCalled();
			expect(ctx.stroke).toHaveBeenCalled();
		});
	});

	describe('drawSpanBar with events', () => {
		it('draws event dots for each span event', () => {
			const ctx = createMockCtx();
			const spanWithEvents = {
				...MOCK_SPAN,
				event: [
					{
						name: 'e1',
						timeUnixNano: 1_010_000_000,
						attributeMap: {},
						isError: false,
					},
					{
						name: 'e2',
						timeUnixNano: 1_025_000_000,
						attributeMap: {},
						isError: true,
					},
				],
			};

			drawSpanBar({
				ctx,
				span: spanWithEvents,
				x: 0,
				y: 0,
				width: 100,
				levelIndex: 0,
				spanRectsArray: [],
				eventRectsArray: [],
				color: '#000',
				isDarkMode: false,
				metrics: METRICS,
			});

			expect(ctx.save).toHaveBeenCalledTimes(3);
			expect(ctx.translate).toHaveBeenCalledTimes(2);
			expect(ctx.fillRect).toHaveBeenCalledTimes(2);
		});
	});
});
