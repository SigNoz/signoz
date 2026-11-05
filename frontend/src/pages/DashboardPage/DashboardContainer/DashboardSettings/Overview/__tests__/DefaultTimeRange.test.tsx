import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import Overview from '../index';

const mockPatchAsync = jest.fn();
jest.mock('../../../hooks/useOptimisticPatch', () => ({
	useOptimisticPatch: (): { patchAsync: jest.Mock; isPatching: boolean } => ({
		patchAsync: mockPatchAsync,
		isPatching: false,
	}),
}));

jest.mock('../CrossPanelSync/CrossPanelSync', () => ({
	__esModule: true,
	default: (): null => null,
}));

function buildDashboard(
	duration?: string,
): DashboardtypesGettableDashboardV2DTO {
	return {
		id: 'dash-1',
		name: 'D',
		orgId: 'org',
		source: DashboardtypesSourceDTO.user,
		locked: false,
		schemaVersion: 'v6',
		tags: [],
		updatedAt: '2026-01-01T00:00:00Z',
		spec: {
			display: { name: 'D' },
			panels: {},
			layouts: [],
			variables: [],
			duration,
		},
	};
}

describe('Dashboard settings - default time range', () => {
	const user = userEvent.setup({ pointerEventsCheck: 0 });

	async function selectOption(label: string): Promise<void> {
		await user.click(screen.getByTestId('dashboard-default-time-range'));
		await user.click(await screen.findByText(label));
	}

	async function save(): Promise<void> {
		await user.click(await screen.findByTestId('save-dashboard-config'));
	}

	beforeEach(() => {
		mockPatchAsync.mockReset();
		mockPatchAsync.mockResolvedValue(undefined);
	});

	it('shows the stored window and patches a new one', async () => {
		render(<Overview dashboard={buildDashboard('30m')} />);

		const trigger = await screen.findByTestId('dashboard-default-time-range');
		expect(trigger).toHaveTextContent('Default (Last 30 minutes)');

		await selectOption('Last 1 hour');

		await expect(screen.findByText('1 unsaved change')).resolves.toBeVisible();

		await save();

		await waitFor(() => {
			expect(mockPatchAsync).toHaveBeenCalledWith([
				{ op: 'replace', path: '/spec/duration', value: '1h' },
			]);
		});
	});

	it('offers the 30-minute default once', async () => {
		render(<Overview dashboard={buildDashboard('1h')} />);

		await user.click(await screen.findByTestId('dashboard-default-time-range'));

		expect(
			screen.getByRole('option', { name: 'Default (Last 30 minutes)' }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('option', { name: 'Last 30 minutes', exact: true }),
		).not.toBeInTheDocument();
	});

	it('patches an empty window when the setting is cleared', async () => {
		render(<Overview dashboard={buildDashboard('1h')} />);

		await selectOption('Default (Last 30 minutes)');
		await save();

		await waitFor(() => {
			expect(mockPatchAsync).toHaveBeenCalledWith([
				{ op: 'replace', path: '/spec/duration', value: '' },
			]);
		});
	});

	it.each([
		['2h', 'Last 2h'],
		['1s', 'Last 1s (opens as 1m)'],
		['1h30m', 'Last 1h30m (opens as 90m)'],
		['0m', '0m (not applied)'],
	])(
		'labels a stored %s that is not one of the options as "%s"',
		async (duration, label) => {
			render(<Overview dashboard={buildDashboard(duration)} />);

			const trigger = await screen.findByTestId('dashboard-default-time-range');
			expect(trigger).toHaveTextContent(label);
		},
	);

	it('does not patch the window when it is untouched', async () => {
		render(<Overview dashboard={buildDashboard('1h')} />);

		await user.type(await screen.findByTestId('dashboard-name'), 'X');
		await save();

		await waitFor(() => {
			expect(mockPatchAsync).toHaveBeenCalledWith([
				{ op: 'replace', path: '/spec/display/name', value: 'DX' },
			]);
		});
	});
});
