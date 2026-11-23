import { render, screen } from 'tests/test-utils';

import EdgeSweep from '../EdgeSweep';

const NOW = 10_000;

describe('EdgeSweep', () => {
	beforeEach(() => {
		jest.spyOn(Date, 'now').mockReturnValue(NOW);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('stays still while Noz is idle', () => {
		render(<EdgeSweep startedAt={null} />);

		expect(
			screen.queryByTestId('ai-input-edge-sweep-line'),
		).not.toBeInTheDocument();
	});

	it('picks up a reply already under way instead of restarting', () => {
		render(<EdgeSweep startedAt={NOW - 1500} />);

		expect(screen.getByTestId('ai-input-edge-sweep-line')).toHaveStyle({
			animationDelay: '-1500ms',
		});
	});

	it('restarts from the left for the next reply', () => {
		const { rerender } = render(<EdgeSweep startedAt={NOW - 1500} />);

		rerender(<EdgeSweep startedAt={NOW} />);

		expect(screen.getByTestId('ai-input-edge-sweep-line')).toHaveStyle({
			animationDelay: '0ms',
		});
	});
});
