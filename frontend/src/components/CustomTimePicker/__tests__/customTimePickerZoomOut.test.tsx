import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useZoomOut } from 'hooks/useZoomOut';

import CustomTimePicker from '../CustomTimePicker';

const mockHandleZoomOut = jest.fn();
jest.mock('hooks/useZoomOut', () => ({
	useZoomOut: (): jest.MockedFunction<typeof useZoomOut> => mockHandleZoomOut,
}));

// Mock other heavy dependencies
jest.mock('providers/Timezone', () => ({
	useTimezone: (): { timezone: { value: string; offset: string } } => ({
		timezone: { value: 'UTC', offset: 'UTC' },
	}),
}));

jest.mock('react-router-dom', () => ({
	useLocation: (): { pathname: string } => ({ pathname: '/logs-explorer' }),
}));

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const defaultProps = {
	onSelect: jest.fn(),
	onError: jest.fn(),
	selectedValue: '15m',
	selectedTime: '15m',
	onValidCustomDateChange: jest.fn(),
	open: false,
	setOpen: jest.fn(),
	items: [
		{ value: '15m', label: 'Last 15 minutes' },
		{ value: '1h', label: 'Last 1 hour' },
	],
	minTime: (now - 15 * 60 * 1000) * 1e6,
	maxTime: now * 1e6,
};

describe('CustomTimePicker - zoom out button', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should render zoom out button when showLiveLogs is false', () => {
		render(<CustomTimePicker {...defaultProps} showLiveLogs={false} />);

		expect(screen.getByTestId('zoom-out-btn')).toBeInTheDocument();
	});

	it('should not render zoom out button when showLiveLogs is true', () => {
		render(<CustomTimePicker {...defaultProps} showLiveLogs={true} />);

		expect(screen.queryByTestId('zoom-out-btn')).not.toBeInTheDocument();
	});

	it('should call handleZoomOut when zoom out button is clicked', async () => {
		render(<CustomTimePicker {...defaultProps} showLiveLogs={false} />);

		const zoomOutBtn = screen.getByTestId('zoom-out-btn');
		await userEvent.click(zoomOutBtn);

		expect(mockHandleZoomOut).toHaveBeenCalledTimes(1);
	});

	it('should disable zoom button when time range is >= 1 month', () => {
		const now = Date.now();
		render(
			<CustomTimePicker
				{...defaultProps}
				minTime={(now - 31 * MS_PER_DAY) * 1e6}
				maxTime={now * 1e6}
				showLiveLogs={false}
			/>,
		);

		const zoomOutBtn = screen.getByTestId('zoom-out-btn');
		expect(zoomOutBtn).toBeDisabled();
	});
});
