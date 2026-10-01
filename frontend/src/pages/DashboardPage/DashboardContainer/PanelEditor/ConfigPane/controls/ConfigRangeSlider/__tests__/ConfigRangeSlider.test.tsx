import { render, screen, userEvent } from 'tests/test-utils';

import ConfigRangeSlider from '../ConfigRangeSlider';

window.ResizeObserver =
	window.ResizeObserver ||
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

describe('ConfigRangeSlider', () => {
	it('renders a thumb per end and the formatted range', () => {
		render(
			<ConfigRangeSlider
				testId="range"
				value={[4, 24]}
				min={2}
				max={40}
				step={1}
				formatValue={([min, max]): string => `${min}–${max} px`}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getAllByRole('slider')).toHaveLength(2);
		expect(screen.getByText('4–24 px')).toBeInTheDocument();
	});

	it('moves one end and reports the pair low to high', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ConfigRangeSlider
				testId="range"
				value={[4, 24]}
				min={2}
				max={40}
				step={1}
				onChange={onChange}
			/>,
		);

		const [, maxThumb] = screen.getAllByRole('slider');
		maxThumb.focus();
		await user.keyboard('{ArrowRight}');

		expect(onChange).toHaveBeenLastCalledWith([4, 25]);
	});
});
