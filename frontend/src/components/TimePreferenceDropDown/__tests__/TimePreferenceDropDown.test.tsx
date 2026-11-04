import { timeItems } from 'constants/timePreference';
import { render, screen, userEvent } from 'tests/test-utils';

import TimePreference from '../index';

describe('TimePreferenceDropDown', () => {
	it('calls setSelectedTime with the clicked item', async () => {
		const setSelectedTime = jest.fn();
		render(
			<TimePreference
				selectedTime={timeItems[0]}
				setSelectedTime={setSelectedTime}
			/>,
		);

		await userEvent.click(screen.getByRole('button', { name: /Global Time/ }));
		await userEvent.click(
			await screen.findByRole('menuitem', { name: 'Last 15 min' }),
		);

		expect(setSelectedTime).toHaveBeenCalledTimes(1);
		expect(setSelectedTime).toHaveBeenCalledWith({
			name: 'Last 15 min',
			enum: 'LAST_15_MIN',
		});
	});
});
