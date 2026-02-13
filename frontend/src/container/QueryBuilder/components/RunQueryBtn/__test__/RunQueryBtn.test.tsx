// frontend/src/container/QueryBuilder/components/RunQueryBtn/__tests__/RunQueryBtn.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';

import RunQueryBtn from '../RunQueryBtn';

jest.mock('react-query', () => {
	const actual = jest.requireActual('react-query');
	return {
		...actual,
		useIsFetching: jest.fn(),
		useQueryClient: jest.fn(),
	};
});
import { useIsFetching, useQueryClient } from 'react-query';

// Mock OS util
jest.mock('utils/getUserOS', () => ({
	getUserOperatingSystem: jest.fn(),
	UserOperatingSystem: { MACOS: 'mac', WINDOWS: 'win', LINUX: 'linux' },
}));
import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

describe('RunQueryBtn', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		(getUserOperatingSystem as jest.Mock).mockReturnValue(
			UserOperatingSystem.MACOS,
		);
		(useIsFetching as jest.Mock).mockReturnValue(0);
		(useQueryClient as jest.Mock).mockReturnValue({
			cancelQueries: jest.fn(),
		});
	});

	test('uses isLoadingQueries prop over useIsFetching', () => {
		// Simulate fetching but prop forces not loading
		(useIsFetching as jest.Mock).mockReturnValue(1);
		const onRun = jest.fn();
		render(<RunQueryBtn onStageRunQuery={onRun} isLoadingQueries={false} />);
		// Should show "Run Query" (not cancel)
		const runBtn = screen.getByRole('button', { name: /run query/i });
		expect(runBtn).toBeInTheDocument();
		expect(runBtn).toBeEnabled();
	});

	test('fallback cancel: uses handleCancelQuery when no key provided', () => {
		(useIsFetching as jest.Mock).mockReturnValue(0);
		const cancelQueries = jest.fn();
		(useQueryClient as jest.Mock).mockReturnValue({ cancelQueries });

		const onCancel = jest.fn();
		render(<RunQueryBtn isLoadingQueries handleCancelQuery={onCancel} />);

		const cancelBtn = screen.getByRole('button', { name: /cancel/i });
		fireEvent.click(cancelBtn);
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(cancelQueries).not.toHaveBeenCalled();
	});

	test('renders run state and triggers on click', () => {
		const onRun = jest.fn();
		render(<RunQueryBtn onStageRunQuery={onRun} />);
		const btn = screen.getByRole('button', { name: /run query/i });
		expect(btn).toBeEnabled();
		fireEvent.click(btn);
		expect(onRun).toHaveBeenCalledTimes(1);
	});

	test('disabled when onStageRunQuery is undefined', () => {
		render(<RunQueryBtn />);
		expect(screen.getByRole('button', { name: /run query/i })).toBeDisabled();
	});

	test('shows cancel state and calls handleCancelQuery', () => {
		const onCancel = jest.fn();
		render(<RunQueryBtn isLoadingQueries handleCancelQuery={onCancel} />);
		const cancel = screen.getByRole('button', { name: /cancel/i });
		fireEvent.click(cancel);
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	test('derives loading from queryKey via useIsFetching and cancels via queryClient', () => {
		(useIsFetching as jest.Mock).mockReturnValue(1);
		const cancelQueries = jest.fn();
		(useQueryClient as jest.Mock).mockReturnValue({ cancelQueries });

		const queryKey = ['GET_QUERY_RANGE', '1h', { some: 'req' }, 1, 2];
		render(<RunQueryBtn queryRangeKey={queryKey} />);

		// Button switches to cancel state
		const cancelBtn = screen.getByRole('button', { name: /cancel/i });
		expect(cancelBtn).toBeInTheDocument();

		// Clicking cancel calls cancelQueries with the key
		fireEvent.click(cancelBtn);
		expect(cancelQueries).toHaveBeenCalledWith(queryKey);
	});

	test('shows Command + CornerDownLeft on mac', () => {
		const { container } = render(
			<RunQueryBtn onStageRunQuery={(): void => {}} />,
		);
		expect(container.querySelector('.lucide-command')).toBeInTheDocument();
		expect(
			container.querySelector('.lucide-corner-down-left'),
		).toBeInTheDocument();
	});

	test('shows ChevronUp + CornerDownLeft on non-mac', () => {
		(getUserOperatingSystem as jest.Mock).mockReturnValue(
			UserOperatingSystem.WINDOWS,
		);
		const { container } = render(
			<RunQueryBtn onStageRunQuery={(): void => {}} />,
		);
		expect(container.querySelector('.lucide-chevron-up')).toBeInTheDocument();
		expect(container.querySelector('.lucide-command')).not.toBeInTheDocument();
		expect(
			container.querySelector('.lucide-corner-down-left'),
		).toBeInTheDocument();
	});

	test('renders custom label when provided', () => {
		const onRun = jest.fn();
		render(<RunQueryBtn onStageRunQuery={onRun} label="Stage & Run Query" />);
		expect(
			screen.getByRole('button', { name: /stage & run query/i }),
		).toBeInTheDocument();
	});
});
