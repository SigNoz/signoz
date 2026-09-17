import type { Mock } from 'vitest';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createDashboardV2 } from 'api/generated/services/dashboard';

import { useCreateExportDashboard } from '../useCreateExportDashboard';

vi.mock('api/generated/services/dashboard', () => ({
	createDashboardV2: vi.fn(),
}));
vi.mock('providers/ErrorModalProvider', () => ({
	useErrorModal: (): { showErrorModal: Mock } => ({
		showErrorModal: vi.fn(),
	}),
}));

const mockCreateV2 = createDashboardV2 as Mock;

function wrapper({ children }: { children: ReactNode }): JSX.Element {
	const client = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const TITLE = 'My dashboard';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('useCreateExportDashboard', () => {
	it('creates via the V2 Perses endpoint and normalizes the response', async () => {
		mockCreateV2.mockResolvedValue({ data: { id: 'v2-new' } });
		const onCreated = vi.fn();

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
	});
});
