import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createDashboardV2 } from 'api/generated/services/dashboard';
import createDashboardV1 from 'api/v1/dashboards/create';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { useIsDashboardV2 } from 'hooks/useIsDashboardV2';
import { Dashboard } from 'types/api/dashboard/getAll';

import { useCreateExportDashboard } from '../useCreateExportDashboard';

jest.mock('hooks/useIsDashboardV2');
jest.mock('api/v1/dashboards/create');
jest.mock('api/generated/services/dashboard', () => ({
	createDashboardV2: jest.fn(),
}));
jest.mock('providers/ErrorModalProvider', () => ({
	useErrorModal: (): { showErrorModal: jest.Mock } => ({
		showErrorModal: jest.fn(),
	}),
}));

const mockUseIsDashboardV2 = useIsDashboardV2 as jest.MockedFunction<
	typeof useIsDashboardV2
>;
const mockCreateV1 = createDashboardV1 as jest.Mock;
const mockCreateV2 = createDashboardV2 as jest.Mock;

function wrapper({ children }: { children: ReactNode }): JSX.Element {
	const client = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const TITLE = 'My dashboard';

beforeEach(() => {
	jest.clearAllMocks();
});

describe('useCreateExportDashboard', () => {
	it('creates via the V1 endpoint and returns the created dashboard when the flag is off', async () => {
		mockUseIsDashboardV2.mockReturnValue(false);
		const v1Dashboard = {
			id: 'v1-new',
			data: { title: TITLE },
		} as unknown as Dashboard;
		mockCreateV1.mockResolvedValue({ httpStatusCode: 200, data: v1Dashboard });
		const onCreated = jest.fn();

		const { result } = renderHook(
			() => useCreateExportDashboard({ title: TITLE, onCreated }),
			{ wrapper },
		);

		act(() => result.current.create());

		await waitFor(() =>
			expect(onCreated).toHaveBeenCalledWith({ id: 'v1-new', title: TITLE }),
		);
		expect(mockCreateV1).toHaveBeenCalledWith({
			title: TITLE,
			uploadedGrafana: false,
			version: ENTITY_VERSION_V5,
		});
		expect(mockCreateV2).not.toHaveBeenCalled();
	});

	it('creates via the V2 Perses endpoint and normalizes the response when the flag is on', async () => {
		mockUseIsDashboardV2.mockReturnValue(true);
		mockCreateV2.mockResolvedValue({ data: { id: 'v2-new' } });
		const onCreated = jest.fn();

		const { result } = renderHook(
			() => useCreateExportDashboard({ title: TITLE, onCreated }),
			{ wrapper },
		);

		act(() => result.current.create());

		await waitFor(() =>
			expect(onCreated).toHaveBeenCalledWith({ id: 'v2-new', title: TITLE }),
		);
		expect(mockCreateV2).toHaveBeenCalledWith(
			expect.objectContaining({
				schemaVersion: 'v6',
				spec: expect.objectContaining({ display: { name: TITLE } }),
			}),
		);
		expect(mockCreateV1).not.toHaveBeenCalled();
	});
});
