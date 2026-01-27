// frontend/src/container/QueryBuilder/components/RunQueryBtn/__tests__/RunQueryBtn.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';

import RunQueryBtn from '../RunQueryBtn';

// Mock OS util
jest.mock('utils/getUserOS', () => ({
	getUserOperatingSystem: jest.fn(),
	UserOperatingSystem: { MACOS: 'mac', WINDOWS: 'win', LINUX: 'linux' },
}));
import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

describe('RunQueryBtn', () => {
	test('renders run state and triggers on click', () => {
		(getUserOperatingSystem as jest.Mock).mockReturnValue(
			UserOperatingSystem.MACOS,
		);
		const onRun = jest.fn();
		render(<RunQueryBtn onStageRunQuery={onRun} />);
		const btn = screen.getByRole('button', { name: /run query/i });
		expect(btn).toBeEnabled();
		fireEvent.click(btn);
		expect(onRun).toHaveBeenCalledTimes(1);
	});

	test('disabled when onStageRunQuery is undefined', () => {
		(getUserOperatingSystem as jest.Mock).mockReturnValue(
			UserOperatingSystem.MACOS,
		);
		render(<RunQueryBtn />);
		expect(screen.getByRole('button', { name: /run query/i })).toBeDisabled();
	});

	test('shows cancel state and calls handleCancelQuery', () => {
		(getUserOperatingSystem as jest.Mock).mockReturnValue(
			UserOperatingSystem.MACOS,
		);
		const onCancel = jest.fn();
		render(<RunQueryBtn isLoadingQueries handleCancelQuery={onCancel} />);
		const cancel = screen.getByRole('button', { name: /cancel/i });
		fireEvent.click(cancel);
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	test('shows Command + CornerDownLeft on mac', () => {
		(getUserOperatingSystem as jest.Mock).mockReturnValue(
			UserOperatingSystem.MACOS,
		);
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
		(getUserOperatingSystem as jest.Mock).mockReturnValue(
			UserOperatingSystem.MACOS,
		);
		const onRun = jest.fn();
		render(<RunQueryBtn onStageRunQuery={onRun} label="Stage & Run Query" />);
		expect(
			screen.getByRole('button', { name: /stage & run query/i }),
		).toBeInTheDocument();
	});
});
