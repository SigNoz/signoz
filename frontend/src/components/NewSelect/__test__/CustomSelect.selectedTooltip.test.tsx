import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CustomSelect from '../CustomSelect';

const LABEL = '/oteldemo.RecommendationService/ListRecommendations';

describe('CustomSelect selected value tooltip', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(400);
		jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it.each([
		['listed in the options', [{ label: LABEL, value: LABEL }]],
		['missing from the options', [{ label: 'other', value: 'other' }]],
	])('reveals a truncated selected value %s on hover', async (_, options) => {
		render(<CustomSelect options={options} value={LABEL} />);

		const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
		await user.hover(screen.getByText(LABEL));
		act(() => {
			jest.advanceTimersByTime(500);
		});

		expect(screen.getByRole('tooltip')).toHaveTextContent(LABEL);
	});
});
