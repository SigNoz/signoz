import { scrollIntoViewWhenReady } from '../scrollIntoViewWhenReady';

describe('scrollIntoViewWhenReady', () => {
	let rafSpy: jest.SpyInstance;

	beforeEach(() => {
		// Run rAF callbacks synchronously so the poll loop resolves within the test.
		rafSpy = jest
			.spyOn(window, 'requestAnimationFrame')
			.mockImplementation((cb: FrameRequestCallback): number => {
				cb(0);
				return 0;
			});
	});

	afterEach(() => {
		rafSpy.mockRestore();
	});

	it('scrolls the resolved element into view immediately when it is ready', () => {
		const scrollIntoView = jest.fn();
		const el = { scrollIntoView } as unknown as Element;

		scrollIntoViewWhenReady(() => el);

		expect(scrollIntoView).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'center',
		});
		expect(rafSpy).not.toHaveBeenCalled();
	});

	it('polls via rAF until the target appears, then scrolls it once', () => {
		const scrollIntoView = jest.fn();
		const el = { scrollIntoView } as unknown as Element;
		let calls = 0;
		const resolveTarget = jest.fn(() => {
			calls += 1;
			return calls >= 3 ? el : null;
		});

		scrollIntoViewWhenReady(resolveTarget);

		expect(resolveTarget).toHaveBeenCalledTimes(3);
		expect(scrollIntoView).toHaveBeenCalledTimes(1);
	});

	it('bails after the attempt budget when the target never appears', () => {
		const resolveTarget = jest.fn(() => null);

		scrollIntoViewWhenReady(resolveTarget, 5);

		// Initial call + 5 rAF retries.
		expect(resolveTarget).toHaveBeenCalledTimes(6);
	});
});
