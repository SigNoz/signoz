import { fireEvent, screen } from '@testing-library/react';
import ROUTES from 'constants/routes';
import { render } from 'tests/test-utils';

import TraceDetailsHeader from '../TraceDetailsHeader';

const mockGoBack = jest.fn();
const mockPush = jest.fn();
const mockHasInAppHistory = jest.fn();

jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		goBack: (): void => mockGoBack(),
		push: (path: string): void => mockPush(path),
		replace: jest.fn(),
		location: { pathname: '/', search: '' },
		listen: (): (() => void) => (): void => undefined,
	},
	hasInAppHistory: (): boolean => mockHasInAppHistory(),
}));

const baseProps = {
	filterMetadata: {
		startTime: 0,
		endTime: 1,
		traceId: 'trace-123',
	},
	onFilteredSpansChange: jest.fn(),
	isDataLoaded: false,
};

describe('TraceDetailsHeader – back button', () => {
	beforeEach(() => {
		mockGoBack.mockClear();
		mockPush.mockClear();
		mockHasInAppHistory.mockReset();
	});

	it('renders the back button', () => {
		mockHasInAppHistory.mockReturnValue(false);
		render(<TraceDetailsHeader {...baseProps} />);
		expect(screen.getByRole('button')).toBeInTheDocument();
	});

	it('calls history.goBack() when there is in-app SPA history', () => {
		mockHasInAppHistory.mockReturnValue(true);
		render(<TraceDetailsHeader {...baseProps} />);

		fireEvent.click(screen.getByRole('button'));

		expect(mockGoBack).toHaveBeenCalledTimes(1);
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('pushes to the traces explorer route when there is no in-app SPA history', () => {
		mockHasInAppHistory.mockReturnValue(false);
		render(<TraceDetailsHeader {...baseProps} />);

		fireEvent.click(screen.getByRole('button'));

		expect(mockPush).toHaveBeenCalledTimes(1);
		expect(mockPush).toHaveBeenCalledWith(ROUTES.TRACES_EXPLORER);
		expect(mockPush).toHaveBeenCalledWith('/traces-explorer');
		expect(mockGoBack).not.toHaveBeenCalled();
	});
});
