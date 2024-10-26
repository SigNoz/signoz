import { render, screen } from 'tests/test-utils';

import CustomTimePicker from './CustomTimePicker';

const mockProps = {
	onSelect: jest.fn(),
	onError: jest.fn(),
	items: [],
	selectedValue: '',
	selectedTime: '',
	open: false,
	setOpen: jest.fn(),
	onValidCustomDateChange: jest.fn(),
	onCustomTimeStatusUpdate: jest.fn(),
	newPopover: false,
	customDateTimeVisible: false,
	setCustomDTPickerVisible: jest.fn(),
	onCustomDateHandler: jest.fn(),
	handleGoLive: jest.fn(),
};

describe('CustomTimePicker Component', () => {
	it('should render the time selection input with autocomplete "off"', async () => {
		render(
			<CustomTimePicker
				onSelect={mockProps.onSelect}
				onError={mockProps.onError}
				items={mockProps.items}
				selectedValue={mockProps.selectedValue}
				selectedTime={mockProps.selectedTime}
				open={mockProps.open}
				setOpen={mockProps.setOpen}
				onValidCustomDateChange={mockProps.onValidCustomDateChange}
				onCustomTimeStatusUpdate={mockProps.onCustomTimeStatusUpdate}
				newPopover={mockProps.newPopover}
				customDateTimeVisible={mockProps.customDateTimeVisible}
				setCustomDTPickerVisible={mockProps.setCustomDTPickerVisible}
				onCustomDateHandler={mockProps.onCustomDateHandler}
				handleGoLive={mockProps.handleGoLive}
			/>,
		);

		const timeSelectionInput = screen.getByTestId('timeSelection-input');

		expect(timeSelectionInput).toBeInTheDocument();

		expect(timeSelectionInput).toHaveAttribute('autocomplete', 'off');
	});
});
