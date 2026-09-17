import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryParams } from 'constants/query';
import { GlobalReducer } from 'types/reducer/globalTime';
import type { Mock } from 'vitest';

import CustomTimePicker from '../CustomTimePicker';

const MS_PER_MIN = 60 * 1000;
const NOW_MS = 1705312800000;

const { mockDispatch, mockSafeNavigate, mockUrlQueryDelete, mockUrlQuerySet } =
	vi.hoisted(() => ({
		mockDispatch: vi.fn(),
		mockSafeNavigate: vi.fn(),
		mockUrlQueryDelete: vi.fn(),
		mockUrlQuerySet: vi.fn(),
	}));

interface MockAppState {
	globalTime: Pick<GlobalReducer, 'minTime' | 'maxTime'>;
}

vi.mock('react-redux', () => ({
	useDispatch: (): Mock => mockDispatch,
	useSelector: (selector: (state: MockAppState) => unknown): unknown => {
		const mockState: MockAppState = {
			globalTime: {
				minTime: (NOW_MS - 15 * MS_PER_MIN) * 1e6,
				maxTime: NOW_MS * 1e6,
			},
		};
		return selector(mockState);
	},
}));

vi.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

interface MockUrlQuery {
	delete: typeof mockUrlQueryDelete;
	set: typeof mockUrlQuerySet;
	get: () => null;
	toString: () => string;
}

vi.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: (): MockUrlQuery => ({
		delete: mockUrlQueryDelete,
		set: mockUrlQuerySet,
		get: (): null => null,
		toString: (): string => 'relativeTime=45m',
	}),
}));

vi.mock('providers/Timezone', () => ({
	useTimezone: (): { timezone: { value: string; offset: string } } => ({
		timezone: { value: 'UTC', offset: 'UTC' },
	}),
}));

vi.mock('react-router-dom', () => ({
	useLocation: (): { pathname: string } => ({ pathname: '/logs-explorer' }),
}));

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const defaultProps = {
	onSelect: vi.fn(),
	onError: vi.fn(),
	selectedValue: '15m',
	selectedTime: '15m',
	onValidCustomDateChange: vi.fn(),
	open: false,
	setOpen: vi.fn(),
	items: [
		{ value: '15m', label: 'Last 15 minutes' },
		{ value: '1h', label: 'Last 1 hour' },
	],
	minTime: (now - 15 * 60 * 1000) * 1e6,
	maxTime: now * 1e6,
};

describe('CustomTimePicker - zoom out button', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(Date, 'now').mockReturnValue(NOW_MS);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should render zoom out button when showLiveLogs is false', () => {
		render(<CustomTimePicker {...defaultProps} showLiveLogs={false} />);

		expect(screen.getByTestId('zoom-out-btn')).toBeInTheDocument();
	});

	it('should not render zoom out button when showLiveLogs is true', () => {
		render(<CustomTimePicker {...defaultProps} showLiveLogs={true} />);

		expect(screen.queryByTestId('zoom-out-btn')).not.toBeInTheDocument();
	});

	it('should not render zoom out button when isModalTimeSelection is true', () => {
		render(
			<CustomTimePicker
				{...defaultProps}
				showLiveLogs={false}
				isModalTimeSelection={true}
			/>,
		);

		expect(screen.queryByTestId('zoom-out-btn')).not.toBeInTheDocument();
	});

	it('should call handleZoomOut when zoom out button is clicked', async () => {
		render(<CustomTimePicker {...defaultProps} showLiveLogs={false} />);

		const zoomOutBtn = screen.getByTestId('zoom-out-btn');
		await userEvent.click(zoomOutBtn);

		expect(mockDispatch).toHaveBeenCalled();
		expect(mockUrlQuerySet).toHaveBeenCalledWith(QueryParams.relativeTime, '45m');
		expect(mockSafeNavigate).toHaveBeenCalledWith(
			expect.stringMatching(/\/logs-explorer\?relativeTime=45m/),
		);
	});

	it('should use real ladder logic: 15m range zooms to 45m preset and updates URL', async () => {
		render(<CustomTimePicker {...defaultProps} showLiveLogs={false} />);

		const zoomOutBtn = screen.getByTestId('zoom-out-btn');
		await userEvent.click(zoomOutBtn);

		expect(mockUrlQueryDelete).toHaveBeenCalledWith(QueryParams.startTime);
		expect(mockUrlQueryDelete).toHaveBeenCalledWith(QueryParams.endTime);
		expect(mockUrlQuerySet).toHaveBeenCalledWith(QueryParams.relativeTime, '45m');
		expect(mockSafeNavigate).toHaveBeenCalledWith(
			expect.stringMatching(/\/logs-explorer\?relativeTime=45m/),
		);
		expect(mockDispatch).toHaveBeenCalled();
	});

	it('should delete activeLogId when zoom out is clicked', async () => {
		render(<CustomTimePicker {...defaultProps} showLiveLogs={false} />);

		const zoomOutBtn = screen.getByTestId('zoom-out-btn');
		await userEvent.click(zoomOutBtn);

		expect(mockUrlQueryDelete).toHaveBeenCalledWith(QueryParams.activeLogId);
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
