import { fireEvent, render, screen } from '@testing-library/react';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';

import CalendarContainer from '../CalendarContainer';

jest.mock('providers/Timezone', () => ({
	useTimezone: () => ({ timezone: { value: 'America/Los_Angeles' } }),
}));

jest.mock('@signozhq/ui/calendar', () => ({
	Calendar: () => <div data-testid="calendar" />,
}));

describe('CalendarContainer', () => {
	const onApply = jest.fn<void, [DateTimeRangeType]>();

	beforeEach(() => {
		onApply.mockClear();
	});

	function renderCalendar(): void {
		render(
			<CalendarContainer
				dateRange={{
					from: new Date(2025, 0, 15),
					to: new Date(2025, 0, 15),
				}}
				initialFrom={new Date('2025-01-16T00:00:00Z')}
				initialTo={new Date('2025-01-16T01:00:00Z')}
				onSelectDateRange={jest.fn()}
				onCancel={jest.fn()}
				onApply={onApply}
			/>,
		);
	}

	it('applies the selected calendar day in the active timezone', () => {
		renderCalendar();

		expect(screen.getByLabelText('Start hours')).toHaveValue('16');
		expect(screen.getByLabelText('End hours')).toHaveValue('17');
		fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

		const [from, to] = onApply.mock.calls[0][0] ?? [];
		expect(from?.toISOString()).toBe('2025-01-16T00:00:00.000Z');
		expect(to?.toISOString()).toBe('2025-01-16T01:00:00.999Z');
	});

	it('prevents a reversed range and allows correcting it', () => {
		renderCalendar();
		fireEvent.change(screen.getByLabelText('Start hours'), {
			target: { value: '18' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

		expect(screen.getByRole('alert')).toHaveTextContent(
			'End time must be after start time.',
		);
		expect(onApply).not.toHaveBeenCalled();

		fireEvent.change(screen.getByLabelText('End hours'), {
			target: { value: '19' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

		expect(onApply).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('does not apply an incomplete time', () => {
		renderCalendar();
		fireEvent.change(screen.getByLabelText('End minutes'), {
			target: { value: '' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

		expect(onApply).not.toHaveBeenCalled();
	});
});
