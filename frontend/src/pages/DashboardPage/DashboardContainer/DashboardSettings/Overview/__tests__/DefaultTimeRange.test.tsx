import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import userEvent from '@testing-library/user-event';
import { server } from 'mocks-server/server';
import { render, screen, waitFor } from 'tests/test-utils';

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
		updatedAt: '2026-01-01T00:00:00Z',
		spec: {
			display: { name: 'D' },
			panels: {},
			layouts: [],
			variables: [],
			duration,
		},
	} as unknown as DashboardtypesGettableDashboardV2DTO;
}

async function selectOption(label: string): Promise<void> {
	await userEvent.click(screen.getByTestId('dashboard-default-time-range'));
	await userEvent.click(await screen.findByText(label));
}

async function save(): Promise<void> {
	await userEvent.click(await screen.findByTestId('save-dashboard-config'));
}

describe('Dashboard settings - default time range', () => {
	beforeEach(() => {
		mockPatchAsync.mockReset();
		mockPatchAsync.mockResolvedValue(undefined);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('shows the stored window and patches a new one', async () => {
		render(<Overview dashboard={buildDashboard('30m')} />);

		const trigger = await screen.findByTestId('dashboard-default-time-range');
		expect(trigger).toHaveTextContent('Last 30 minutes');

		await selectOption('Last 1 hour');

		const footer = await screen.findByText('1 unsaved change');
		expect(footer).toBeInTheDocument();

		await save();

		await waitFor(() => {
			expect(mockPatchAsync).toHaveBeenCalledWith([
				{ op: 'replace', path: '/spec/duration', value: '1h' },
			]);
		});
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

	// A window set through the API can sit outside the option list.
	it('displays a stored window that is not one of the options', async () => {
		render(<Overview dashboard={buildDashboard('2h')} />);

		const trigger = await screen.findByTestId('dashboard-default-time-range');
		expect(trigger).toHaveTextContent('Last 2h');
	});

	it('does not patch the window when it is untouched', async () => {
		render(<Overview dashboard={buildDashboard('1h')} />);

		await userEvent.type(await screen.findByTestId('dashboard-name'), 'X');
		await save();

		await waitFor(() => {
			expect(mockPatchAsync).toHaveBeenCalledWith([
				{ op: 'replace', path: '/spec/display/name', value: 'DX' },
			]);
		});
	});
});
