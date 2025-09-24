// Mock dependencies before imports
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import useUrlQuery from 'hooks/useUrlQuery';
import GetMinMax from 'lib/getMinMax';
import { useSelector } from 'react-redux';
import { matchPath, useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';

import ShareURLModal from '../ShareURLModal';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: jest.fn(),
	matchPath: jest.fn(),
}));

jest.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: jest.fn(),
}));

jest.mock('lib/getMinMax', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: jest.fn(),
}));

// Mock window.location
const mockLocation = {
	href: 'https://example.com/test-path?param=value',
	origin: 'https://example.com',
};
Object.defineProperty(window, 'location', {
	value: mockLocation,
	writable: true,
});

const mockLogEvent = logEvent as jest.Mock;
const mockUseLocation = useLocation as jest.Mock;
const mockUseUrlQuery = useUrlQuery as jest.Mock;
const mockUseSelector = useSelector as jest.Mock;
const mockGetMinMax = GetMinMax as jest.Mock;
const mockUseCopyToClipboard = useCopyToClipboard as jest.Mock;
const mockMatchPath = matchPath as jest.Mock;

const mockUrlQuery = {
	get: jest.fn(),
	set: jest.fn(),
	delete: jest.fn(),
	toString: jest.fn(() => 'param=value'),
};

const mockHandleCopyToClipboard = jest.fn();

const TEST_PATH = '/test-path';
const ENABLE_ABSOLUTE_TIME_TEXT = 'Enable absolute time';

describe('ShareURLModal', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		mockUseLocation.mockReturnValue({
			pathname: TEST_PATH,
		});

		mockUseUrlQuery.mockReturnValue(mockUrlQuery);

		mockUseSelector.mockReturnValue({
			selectedTime: '5min',
		});

		mockGetMinMax.mockReturnValue({
			minTime: 1000000,
			maxTime: 2000000,
		});

		mockUseCopyToClipboard.mockReturnValue([null, mockHandleCopyToClipboard]);

		mockMatchPath.mockReturnValue(false);

		// Reset URL query mocks - all return null by default
		mockUrlQuery.get.mockReturnValue(null);

		// Reset mock functions
		mockUrlQuery.set.mockClear();
		mockUrlQuery.delete.mockClear();
		mockUrlQuery.toString.mockReturnValue('param=value');
	});

	it('should render share modal with copy button', () => {
		render(<ShareURLModal />);

		expect(screen.getByText('Share page link')).toBeInTheDocument();
		expect(
			screen.getByText('Share the current page link with your team member'),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /copy page link/i }),
		).toBeInTheDocument();
	});

	it('should copy URL and log event when copy button is clicked', async () => {
		const user = userEvent.setup();
		render(<ShareURLModal />);

		const copyButton = screen.getByRole('button', { name: /copy page link/i });
		await user.click(copyButton);

		expect(mockHandleCopyToClipboard).toHaveBeenCalled();
		expect(mockLogEvent).toHaveBeenCalledWith('Share: Copy link clicked', {
			page: TEST_PATH,
			URL: expect.any(String),
		});
	});

	it('should show absolute time toggle when on time-enabled route', () => {
		mockMatchPath.mockReturnValue(true); // Simulate being on a route that supports time

		render(<ShareURLModal />);

		expect(screen.getByText(ENABLE_ABSOLUTE_TIME_TEXT)).toBeInTheDocument();
		expect(screen.getByRole('switch')).toBeInTheDocument();
	});

	it('should show absolute time toggle when URL has time parameters', () => {
		mockUrlQuery.get.mockImplementation((key: string) =>
			key === 'relativeTime' ? '5min' : null,
		);

		render(<ShareURLModal />);

		expect(screen.getByText(ENABLE_ABSOLUTE_TIME_TEXT)).toBeInTheDocument();
	});

	it('should toggle absolute time switch', async () => {
		const user = userEvent.setup();
		mockMatchPath.mockReturnValue(true);
		mockUseSelector.mockReturnValue({
			selectedTime: '5min', // Non-custom time should enable absolute time by default
		});

		render(<ShareURLModal />);

		const toggleSwitch = screen.getByRole('switch');
		// Should be checked by default for non-custom time
		expect(toggleSwitch).toBeChecked();

		await user.click(toggleSwitch);
		expect(toggleSwitch).not.toBeChecked();
	});

	it('should disable toggle when relative time is invalid', () => {
		mockUseSelector.mockReturnValue({
			selectedTime: 'custom',
		});

		// Invalid - missing start and end time for custom
		mockUrlQuery.get.mockReturnValue(null);

		mockMatchPath.mockReturnValue(true);

		render(<ShareURLModal />);

		expect(
			screen.getByText('Please select / enter valid relative time to toggle.'),
		).toBeInTheDocument();
		expect(screen.getByRole('switch')).toBeDisabled();
	});

	it('should process URL with absolute time for non-custom time', async () => {
		const user = userEvent.setup();
		mockMatchPath.mockReturnValue(true);
		mockUseSelector.mockReturnValue({
			selectedTime: '5min',
		});

		render(<ShareURLModal />);

		// Absolute time should be enabled by default for non-custom time
		// Click copy button directly
		const copyButton = screen.getByRole('button', { name: /copy page link/i });
		await user.click(copyButton);

		expect(mockUrlQuery.set).toHaveBeenCalledWith('startTime', '1000000');
		expect(mockUrlQuery.set).toHaveBeenCalledWith('endTime', '2000000');
		expect(mockUrlQuery.delete).toHaveBeenCalledWith('relativeTime');
	});

	it('should process URL with custom time parameters', async () => {
		const user = userEvent.setup();
		mockMatchPath.mockReturnValue(true);
		mockUseSelector.mockReturnValue({
			selectedTime: 'custom',
		});

		mockUrlQuery.get.mockImplementation((key: string) => {
			switch (key) {
				case 'startTime':
					return '1500000';
				case 'endTime':
					return '1600000';
				default:
					return null;
			}
		});

		render(<ShareURLModal />);

		// Should be enabled by default for custom time
		const copyButton = screen.getByRole('button', { name: /copy page link/i });
		await user.click(copyButton);

		expect(mockUrlQuery.set).toHaveBeenCalledWith('startTime', '1500000');
		expect(mockUrlQuery.set).toHaveBeenCalledWith('endTime', '1600000');
	});

	it('should process URL with relative time when absolute time is disabled', async () => {
		const user = userEvent.setup();
		mockMatchPath.mockReturnValue(true);
		mockUseSelector.mockReturnValue({
			selectedTime: '5min',
		});

		render(<ShareURLModal />);

		// Disable absolute time first (it's enabled by default for non-custom time)
		const toggleSwitch = screen.getByRole('switch');
		await user.click(toggleSwitch);

		const copyButton = screen.getByRole('button', { name: /copy page link/i });
		await user.click(copyButton);

		expect(mockUrlQuery.delete).toHaveBeenCalledWith('startTime');
		expect(mockUrlQuery.delete).toHaveBeenCalledWith('endTime');
		expect(mockUrlQuery.set).toHaveBeenCalledWith('relativeTime', '5min');
	});

	it('should handle routes that should be shared with time', async () => {
		const user = userEvent.setup();
		mockUseLocation.mockReturnValue({
			pathname: ROUTES.LOGS_EXPLORER,
		});

		mockMatchPath.mockImplementation(
			(pathname: string, options: any) => options.path === ROUTES.LOGS_EXPLORER,
		);

		render(<ShareURLModal />);

		expect(screen.getByText(ENABLE_ABSOLUTE_TIME_TEXT)).toBeInTheDocument();
		expect(screen.getByRole('switch')).toBeChecked();

		// on clicking copy page link, the copied url should have startTime and endTime
		const copyButton = screen.getByRole('button', { name: /copy page link/i });

		await user.click(copyButton);

		expect(mockUrlQuery.set).toHaveBeenCalledWith('startTime', '1000000');
		expect(mockUrlQuery.set).toHaveBeenCalledWith('endTime', '2000000');
		expect(mockUrlQuery.delete).toHaveBeenCalledWith('relativeTime');

		// toggle the switch to share url with relative time
		const toggleSwitch = screen.getByRole('switch');
		await user.click(toggleSwitch);

		await user.click(copyButton);

		expect(mockUrlQuery.delete).toHaveBeenCalledWith('startTime');
		expect(mockUrlQuery.delete).toHaveBeenCalledWith('endTime');
		expect(mockUrlQuery.set).toHaveBeenCalledWith('relativeTime', '5min');
	});
});
