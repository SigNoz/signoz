import { LOCALSTORAGE } from 'constants/localStorage';
import { render, screen, userEvent, within } from 'tests/test-utils';
import { getSavedTimeRanges } from 'utils/savedTimeRangeUtils';

import { CustomTimePickerInputStatus } from '../CustomTimePicker';
import CustomTimePickerPopoverContent from '../CustomTimePickerPopoverContent';

jest.mock('providers/Timezone', () => ({
	__esModule: true,
	...jest.requireActual('providers/Timezone'),
	useTimezone: (): {
		timezone: { value: string; offset: string; name: string };
	} => ({
		timezone: { value: 'UTC', offset: 'UTC', name: 'UTC' },
	}),
}));

const recentRange = {
	from: '2026-10-01T10:00:00.000Z',
	to: '2026-10-01T11:00:00.000Z',
	timestamp: 1,
};
const recentLabel = '01 Oct 2026, 10:00:00 - 01 Oct 2026, 11:00:00';

const onCustomDateHandler = jest.fn();
const setIsOpen = jest.fn();

function renderPopover(showRecentlyUsed = true): void {
	render(
		<CustomTimePickerPopoverContent
			isLiveLogsEnabled={false}
			minTime={0}
			maxTime={0}
			options={[]}
			setIsOpen={setIsOpen}
			customDateTimeVisible={false}
			setCustomDTPickerVisible={jest.fn()}
			onCustomDateHandler={onCustomDateHandler}
			onSelectHandler={jest.fn()}
			onTimezoneChange={jest.fn()}
			onGoLive={jest.fn()}
			selectedTime="15m"
			activeView="datetime"
			setActiveView={jest.fn()}
			isOpenedFromFooter={false}
			setIsOpenedFromFooter={jest.fn()}
			onExitLiveLogs={jest.fn()}
			showRecentlyUsed={showRecentlyUsed}
			customDateTimeInputStatus={CustomTimePickerInputStatus.UNSET}
			inputErrorDetails={null}
		/>,
	);
}

function seedSavedRange(name: string): void {
	localStorage.setItem(
		LOCALSTORAGE.SAVED_CUSTOM_TIME_RANGES,
		JSON.stringify([{ name, from: recentRange.from, to: recentRange.to }]),
	);
}

describe('CustomTimePickerPopoverContent - saved time ranges', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
		localStorage.setItem(
			LOCALSTORAGE.LAST_USED_CUSTOM_TIME_RANGES,
			JSON.stringify([recentRange]),
		);
	});

	it('saves a recently used range under a name', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderPopover();

		expect(screen.queryByTestId('saved-time-ranges')).not.toBeInTheDocument();

		await user.click(screen.getByTestId('recently-used-time-range-pin'));
		await user.type(
			screen.getByTestId('saved-time-range-name-input'),
			'Test 1{Enter}',
		);

		const saved = screen.getByTestId('saved-time-ranges');
		expect(within(saved).getByText('Test 1')).toBeInTheDocument();
		expect(within(saved).getByText(recentLabel)).toBeInTheDocument();
		expect(
			screen.queryByTestId('recently-used-time-range-pin'),
		).not.toBeInTheDocument();
		expect(getSavedTimeRanges()).toStrictEqual([
			{ name: 'Test 1', from: recentRange.from, to: recentRange.to },
		]);
	});

	it('discards the name on cancel', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderPopover();

		await user.click(screen.getByTestId('recently-used-time-range-pin'));
		await user.type(screen.getByTestId('saved-time-range-name-input'), 'Draft');
		await user.click(screen.getByTestId('saved-time-range-name-cancel'));

		expect(screen.queryByTestId('saved-time-ranges')).not.toBeInTheDocument();
		expect(getSavedTimeRanges()).toStrictEqual([]);
	});

	it('applies a saved range and closes the picker', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		seedSavedRange('Test 1');
		renderPopover();

		await user.click(screen.getByTestId('saved-time-range-item'));

		expect(onCustomDateHandler).toHaveBeenCalledTimes(1);
		const [[[start, end]]] = onCustomDateHandler.mock.calls;
		expect(start.toISOString()).toBe(recentRange.from);
		expect(end.toISOString()).toBe(recentRange.to);
		expect(setIsOpen).toHaveBeenCalledWith(false);
	});

	it('renames a saved range', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		seedSavedRange('Test 1');
		renderPopover();

		await user.click(screen.getByTestId('saved-time-range-rename'));
		const input = screen.getByTestId('saved-time-range-name-input');
		await user.clear(input);
		await user.type(input, 'Successful test');
		await user.click(screen.getByTestId('saved-time-range-name-submit'));

		expect(screen.getByText('Successful test')).toBeInTheDocument();
		expect(getSavedTimeRanges()[0].name).toBe('Successful test');
	});

	it('removes a saved range', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		seedSavedRange('Test 1');
		renderPopover();

		await user.click(screen.getByTestId('saved-time-range-remove'));

		expect(screen.queryByTestId('saved-time-ranges')).not.toBeInTheDocument();
		expect(getSavedTimeRanges()).toStrictEqual([]);
		expect(
			screen.getByTestId('recently-used-time-range-pin'),
		).toBeInTheDocument();
	});

	it('hides saved ranges when recently used ranges are hidden', () => {
		seedSavedRange('Test 1');
		renderPopover(false);

		expect(screen.queryByTestId('saved-time-ranges')).not.toBeInTheDocument();
	});
});
