import type { Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RunQueryBtn from '../RunQueryBtn';

// Mock OS util
vi.mock('utils/getUserOS', () => ({
	getUserOperatingSystem: vi.fn(),
	UserOperatingSystem: { MACOS: 'mac', WINDOWS: 'win', LINUX: 'linux' },
}));
import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

describe('RunQueryBtn', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		(getUserOperatingSystem as Mock).mockReturnValue(UserOperatingSystem.MACOS);
	});

	it('renders run state and triggers on click', async () => {
		const user = userEvent.setup();
		const onRun = vi.fn();
		const onCancel = vi.fn();
		render(
			<RunQueryBtn
				onStageRunQuery={onRun}
				handleCancelQuery={onCancel}
				isLoadingQueries={false}
			/>,
		);
		const btn = screen.getByRole('button', { name: /run query/i });
		expect(btn).toBeEnabled();
		await user.click(btn);
		expect(onRun).toHaveBeenCalledTimes(1);
	});

	it('shows cancel state and calls handleCancelQuery', async () => {
		const user = userEvent.setup();
		const onRun = vi.fn();
		const onCancel = vi.fn();
		render(
			<RunQueryBtn
				onStageRunQuery={onRun}
				handleCancelQuery={onCancel}
				isLoadingQueries
			/>,
		);
		const cancel = screen.getByRole('button', { name: /cancel/i });
		await user.click(cancel);
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it('disabled when disabled prop is true', () => {
		render(<RunQueryBtn disabled />);
		expect(screen.getByRole('button', { name: /run query/i })).toBeDisabled();
	});

	it('disabled when no props provided', () => {
		render(<RunQueryBtn />);
		expect(
			screen.getByRole('button', { name: /run query/i }),
		).toBeInTheDocument();
	});

	it('shows Command + CornerDownLeft on mac', () => {
		render(
			<RunQueryBtn
				onStageRunQuery={vi.fn()}
				handleCancelQuery={vi.fn()}
				isLoadingQueries={false}
			/>,
		);
		expect(screen.getByTestId('cmd-hint-modifier-mac')).toBeInTheDocument();
		expect(screen.getByTestId('cmd-hint-enter')).toBeInTheDocument();
	});

	it('shows ChevronUp + CornerDownLeft on non-mac', () => {
		(getUserOperatingSystem as Mock).mockReturnValue(UserOperatingSystem.WINDOWS);
		render(
			<RunQueryBtn
				onStageRunQuery={vi.fn()}
				handleCancelQuery={vi.fn()}
				isLoadingQueries={false}
			/>,
		);
		expect(screen.getByTestId('cmd-hint-modifier-non-mac')).toBeInTheDocument();
		expect(screen.queryByTestId('cmd-hint-modifier-mac')).not.toBeInTheDocument();
		expect(screen.getByTestId('cmd-hint-enter')).toBeInTheDocument();
	});

	it('renders custom label when provided', () => {
		render(
			<RunQueryBtn
				onStageRunQuery={vi.fn()}
				handleCancelQuery={vi.fn()}
				isLoadingQueries={false}
				label="Stage & Run Query"
			/>,
		);
		expect(
			screen.getByRole('button', { name: /stage & run query/i }),
		).toBeInTheDocument();
	});
});
