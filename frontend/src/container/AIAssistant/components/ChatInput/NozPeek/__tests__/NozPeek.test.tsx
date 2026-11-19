import { render, screen, userEvent } from 'tests/test-utils';

import NozPeek from '../NozPeek';

describe('NozPeek', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it('keeps its eye still while it is still climbing over the edge', async () => {
		const user = userEvent.setup({
			advanceTimers: (ms) => jest.advanceTimersByTime(ms),
		});
		render(<NozPeek />);

		await user.pointer({
			target: document.body,
			coords: { clientX: 200, clientY: 0 },
		});

		expect(screen.getByTestId('ai-noz-peek-pupil').style.transform).toBe('');
	});

	it('follows the cursor with its eye once it has settled', async () => {
		const user = userEvent.setup({
			advanceTimers: (ms) => jest.advanceTimersByTime(ms),
		});
		render(<NozPeek />);
		jest.advanceTimersByTime(1900);

		await user.pointer({
			target: document.body,
			coords: { clientX: 200, clientY: 0 },
		});

		expect(screen.getByTestId('ai-noz-peek-pupil').style.transform).toBe(
			'translate(1.250px, 0.000px)',
		);
	});

	it('keeps its eye still with reduced motion, even once it has settled', async () => {
		jest
			.spyOn(window, 'matchMedia')
			.mockImplementation((query: string): MediaQueryList => ({
				matches: query === '(prefers-reduced-motion: reduce)',
				media: query,
				onchange: null,
				addListener: jest.fn(),
				removeListener: jest.fn(),
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
				dispatchEvent: jest.fn(),
			}));
		const user = userEvent.setup({
			advanceTimers: (ms) => jest.advanceTimersByTime(ms),
		});
		render(<NozPeek />);
		jest.advanceTimersByTime(1900);

		await user.pointer({
			target: document.body,
			coords: { clientX: 200, clientY: 0 },
		});

		expect(screen.getByTestId('ai-noz-peek-pupil').style.transform).toBe('');
	});
});
