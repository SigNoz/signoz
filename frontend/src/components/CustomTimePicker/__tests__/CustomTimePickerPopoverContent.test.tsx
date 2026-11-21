import dayjs from 'dayjs';
import { render, screen, userEvent } from 'tests/test-utils';

import CustomTimePickerPopoverContent from '../CustomTimePickerPopoverContent';
import { CustomTimePickerInputStatus } from '../CustomTimePicker';

const NANOSECONDS_PER_MILLISECOND = 1_000_000;

const minTime =
	dayjs('2024-01-01 00:00:00').valueOf() * NANOSECONDS_PER_MILLISECOND;
const maxTime =
	dayjs('2024-01-03 00:00:00').valueOf() * NANOSECONDS_PER_MILLISECOND;

interface RenderOptions {
	customDateTimeVisible: boolean;
	setIsOpen?: jest.Mock;
	setCustomDTPickerVisible?: jest.Mock;
	onCustomDateHandler?: jest.Mock;
}

function renderPopoverContent({
	customDateTimeVisible,
	setIsOpen = jest.fn(),
	setCustomDTPickerVisible = jest.fn(),
	onCustomDateHandler = jest.fn(),
}: RenderOptions): void {
	render(
		<CustomTimePickerPopoverContent
			isLiveLogsEnabled={false}
			minTime={minTime}
			maxTime={maxTime}
			options={[
				{ label: 'Last 5 minutes', value: '5m' },
				{ label: 'Custom Date Range', value: 'custom' },
			]}
			setIsOpen={setIsOpen}
			customDateTimeVisible={customDateTimeVisible}
			setCustomDTPickerVisible={setCustomDTPickerVisible}
			onCustomDateHandler={onCustomDateHandler}
			onSelectHandler={jest.fn()}
			onTimezoneChange={jest.fn()}
			onGoLive={jest.fn()}
			selectedTime="custom"
			activeView="datetime"
			setActiveView={jest.fn()}
			isOpenedFromFooter={false}
			setIsOpenedFromFooter={jest.fn()}
			onExitLiveLogs={jest.fn()}
			showRecentlyUsed={false}
			customDateTimeInputStatus={CustomTimePickerInputStatus.UNSET}
			inputErrorDetails={null}
		/>,
	);
}

describe('CustomTimePickerPopoverContent calendar', () => {
	it('keeps the calendar out of the popover while relative times show', () => {
		renderPopoverContent({ customDateTimeVisible: false });

		expect(screen.getByTestId('time-option-5m')).toBeInTheDocument();
		expect(
			screen.queryByTestId('calendar-container-fallback'),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('calendar-container')).not.toBeInTheDocument();
	});

	it('holds the calendar slot with a fallback until the calendar loads', async () => {
		renderPopoverContent({ customDateTimeVisible: true });

		expect(
			screen
				.getByTestId('calendar-container-fallback')
				.style.getPropertyValue('--calendar-week-count'),
		).toBe('5');

		await expect(
			screen.findByTestId('calendar-container'),
		).resolves.toBeInTheDocument();
		expect(
			screen.queryByTestId('calendar-container-fallback'),
		).not.toBeInTheDocument();
	});

	it('closes the calendar view when Cancel is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const setCustomDTPickerVisible = jest.fn();
		renderPopoverContent({
			customDateTimeVisible: true,
			setCustomDTPickerVisible,
		});

		await user.click(await screen.findByTestId('calendar-cancel-btn'));

		expect(setCustomDTPickerVisible).toHaveBeenCalledWith(false);
	});

	it('applies the selected range and closes the popover when Apply is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const setIsOpen = jest.fn();
		const onCustomDateHandler = jest.fn();
		renderPopoverContent({
			customDateTimeVisible: true,
			setIsOpen,
			onCustomDateHandler,
		});

		await user.click(await screen.findByTestId('calendar-apply-btn'));

		expect(onCustomDateHandler).toHaveBeenCalledTimes(1);
		const [[from, to]] = onCustomDateHandler.mock.calls[0];
		expect(to.diff(from, 'hour')).toBe(71);
		expect(setIsOpen).toHaveBeenCalledWith(false);
	});
});
