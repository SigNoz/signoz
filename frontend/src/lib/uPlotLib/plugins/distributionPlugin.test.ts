import distributionPlugin from './distributionPlugin';

describe('distributionPlugin', () => {
	let mockCtx: any;
	let mockUPlot: any;
	let mockOver: HTMLDivElement;

	beforeEach(() => {
		mockCtx = {
			fillRect: jest.fn(),
			strokeRect: jest.fn(),
			beginPath: jest.fn(),
			rect: jest.fn(),
			clip: jest.fn(),
			save: jest.fn(),
			restore: jest.fn(),
			fillStyle: '',
			strokeStyle: '',
			lineWidth: 0,
		};

		mockOver = document.createElement('div');
		Object.defineProperty(mockOver, 'getBoundingClientRect', {
			value: jest.fn(() => ({
				left: 100,
				top: 50,
				width: 300,
				height: 200,
			})),
		});

		mockUPlot = {
			data: [[], []],
			ctx: mockCtx,
			over: mockOver,
			bbox: { left: 10, top: 10, width: 300, height: 200 },
			cursor: { left: null, top: null },
			scales: {
				y: { min: 0, max: 100, log: false },
			},
			valToPos: jest.fn((val: number) => 200 - val * 2),
		};
	});

	describe('initialization', () => {
		it('creates hover box element on init', () => {
			const plugin = distributionPlugin();
			(plugin.hooks.init as any)(mockUPlot);

			const hoverBox = mockOver.querySelector('div');
			expect(hoverBox).toBeTruthy();
			expect(hoverBox?.style.position).toBe('absolute');
			expect(hoverBox?.style.display).toBe('none');
		});

		it('attaches event listeners on init', () => {
			const addEventListenerSpy = jest.spyOn(mockOver, 'addEventListener');
			const plugin = distributionPlugin();
			(plugin.hooks.init as any)(mockUPlot);

			expect(addEventListenerSpy).toHaveBeenCalledWith(
				'mouseenter',
				expect.any(Function),
			);
			expect(addEventListenerSpy).toHaveBeenCalledWith(
				'click',
				expect.any(Function),
			);
			expect(addEventListenerSpy).toHaveBeenCalledWith(
				'mouseleave',
				expect.any(Function),
			);
		});
	});

	describe('drawing bars', () => {
		it('draws distribution bars correctly', () => {
			const plugin = distributionPlugin({
				barColor: 'rgba(87, 148, 242, 0.8)',
			});

			mockUPlot.data = [
				[0, 1, 2, 3], // x values (bucket indices)
				[10, 20, 30, 15], // counts
			];

			(plugin.hooks.draw as any)(mockUPlot);

			expect(mockCtx.save).toHaveBeenCalled();
			expect(mockCtx.beginPath).toHaveBeenCalled();
			expect(mockCtx.clip).toHaveBeenCalled();
			expect(mockCtx.fillRect).toHaveBeenCalled();
			expect(mockCtx.restore).toHaveBeenCalled();
		});

		it('draws grid lines when showGrid is true', () => {
			const plugin = distributionPlugin({
				showGrid: true,
				gridColor: 'rgba(0, 0, 0, 0.5)',
				gridLineWidth: 0.5,
			});

			mockUPlot.data = [
				[0, 1],
				[10, 20],
			];

			(plugin.hooks.draw as any)(mockUPlot);

			expect(mockCtx.strokeRect).toHaveBeenCalled();
		});

		it('skips bars with zero or negative counts in log scale', () => {
			const plugin = distributionPlugin();

			mockUPlot.scales.y.log = true;
			mockUPlot.data = [
				[0, 1, 2],
				[10, 0, -5], // Second and third should be skipped
			];

			(plugin.hooks.draw as any)(mockUPlot);

			// Should only draw one bar
			expect(mockCtx.fillRect).toHaveBeenCalledTimes(1);
		});

		it('handles empty data gracefully', () => {
			const plugin = distributionPlugin();

			mockUPlot.data = [[], []];

			expect(() => {
				(plugin.hooks.draw as any)(mockUPlot);
			}).not.toThrow();
		});
	});

	describe('hover interactions', () => {
		it('calls onHover with correct data when hovering over a bar', () => {
			const onHover = jest.fn();
			const plugin = distributionPlugin({ onHover });

			(plugin.hooks.init as any)(mockUPlot);

			mockUPlot.data = [
				[0, 1, 2],
				[10, 20, 30],
			];

			mockUPlot.cursor.left = 50; // Hover over first bar
			mockUPlot.cursor.top = 100;

			(plugin.hooks.setCursor as any)(mockUPlot);

			expect(onHover).toHaveBeenCalledWith(
				expect.objectContaining({
					bucketIndex: 0,
					count: 10,
					label: 'Bucket 0',
				}),
				expect.objectContaining({
					x: expect.any(Number),
					y: expect.any(Number),
				}),
			);
		});

		it('shows hover box when cursor is over a bar', () => {
			const plugin = distributionPlugin();
			(plugin.hooks.init as any)(mockUPlot);

			const hoverBox = mockOver.querySelector('div') as HTMLDivElement;

			mockUPlot.data = [
				[0, 1, 2],
				[10, 20, 30],
			];

			mockUPlot.cursor.left = 50;
			mockUPlot.cursor.top = 100;

			(plugin.hooks.setCursor as any)(mockUPlot);

			expect(hoverBox.style.display).toBe('block');
		});

		it('hides hover box when cursor leaves', () => {
			const onHover = jest.fn();
			const plugin = distributionPlugin({ onHover });
			(plugin.hooks.init as any)(mockUPlot);

			const hoverBox = mockOver.querySelector('div') as HTMLDivElement;

			mockUPlot.data = [
				[0, 1],
				[10, 20],
			];

			// First hover over a bar
			mockUPlot.cursor.left = 50;
			mockUPlot.cursor.top = 100;
			(plugin.hooks.setCursor as any)(mockUPlot);

			// Then move cursor away
			mockUPlot.cursor.left = null;
			mockUPlot.cursor.top = null;
			(plugin.hooks.setCursor as any)(mockUPlot);

			expect(hoverBox.style.display).toBe('none');
			expect(onHover).toHaveBeenLastCalledWith(null, { x: 0, y: 0 });
		});

		it('calls onHover with null when mouse leaves the chart', () => {
			const onHover = jest.fn();
			const plugin = distributionPlugin({ onHover });
			(plugin.hooks.init as any)(mockUPlot);

			mockUPlot.data = [
				[0, 1],
				[10, 20],
			];

			const mouseleaveEvent = new Event('mouseleave');
			mockOver.dispatchEvent(mouseleaveEvent);

			expect(onHover).toHaveBeenCalledWith(null, { x: 0, y: 0 });
		});
	});

	describe('click interactions', () => {
		it('calls onClick with correct data when clicking on a bar', () => {
			const onClick = jest.fn();
			const plugin = distributionPlugin({ onClick });
			(plugin.hooks.init as any)(mockUPlot);

			mockUPlot.data = [
				[0, 1, 2],
				[10, 20, 30],
			];

			const clickEvent = new MouseEvent('click', {
				clientX: 150, // 150 - 100 (rect.left) = 50
				clientY: 100,
			});
			mockOver.dispatchEvent(clickEvent);

			expect(onClick).toHaveBeenCalledWith(
				expect.objectContaining({
					bucketIndex: 0,
					count: 10,
					label: 'Bucket 0',
				}),
				expect.objectContaining({
					x: 150,
					y: 100,
				}),
			);
		});

		it('does not call onClick when clicking outside bars', () => {
			const onClick = jest.fn();
			const plugin = distributionPlugin({ onClick });
			(plugin.hooks.init as any)(mockUPlot);

			mockUPlot.data = [
				[0, 1],
				[10, 20],
			];

			const clickEvent = new MouseEvent('click', {
				clientX: 1000,
				clientY: 1000,
			});
			mockOver.dispatchEvent(clickEvent);

			expect(onClick).not.toHaveBeenCalled();
		});
	});

	describe('bucket index calculation', () => {
		it('calculates correct bucket index from x position', () => {
			const onHover = jest.fn();
			const plugin = distributionPlugin({ onHover });
			(plugin.hooks.init as any)(mockUPlot);

			mockUPlot.data = [
				[0, 1, 2, 3],
				[10, 20, 30, 40],
			];

			const positions = [
				{ left: 0, expectedIndex: 0 },
				{ left: 75, expectedIndex: 1 },
				{ left: 150, expectedIndex: 2 },
				{ left: 225, expectedIndex: 3 },
			];

			positions.forEach(({ left, expectedIndex }) => {
				onHover.mockClear();
				mockUPlot.cursor.left = left;
				mockUPlot.cursor.top = 100;
				(plugin.hooks.setCursor as any)(mockUPlot);

				expect(onHover).toHaveBeenCalledWith(
					expect.objectContaining({
						bucketIndex: expectedIndex,
					}),
					expect.any(Object),
				);
			});
		});
	});

	describe('custom styling options', () => {
		it('applies custom bar color', () => {
			const customColor = 'rgba(255, 0, 0, 0.8)';
			const plugin = distributionPlugin({ barColor: customColor });

			mockUPlot.data = [[0], [10]];

			(plugin.hooks.draw as any)(mockUPlot);

			expect(mockCtx.fillStyle).toBe(customColor);
		});

		it('applies custom hover stroke and width', () => {
			const plugin = distributionPlugin({
				hoverStroke: 'rgba(255, 255, 0, 1)',
				hoverLineWidth: 3,
			});

			(plugin.hooks.init as any)(mockUPlot);

			const hoverBox = mockOver.querySelector('div') as HTMLDivElement;
			expect(hoverBox.style.border).toContain('3px');
			expect(hoverBox.style.border).toContain('rgba(255, 255, 0, 1)');
		});
	});
});
