import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { renderHook } from 'tests/test-utils';
import {
	type DashboardtypesGettableDashboardV2DTO,
	type DashboardtypesVariableDTO,
	DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTOKind as TextVariableKind,
} from 'api/generated/services/sigNoz.schemas';

import type { DashboardQuerySource } from '../../store/slices/editContextSlice';
import { useDashboardFetchRequired } from '../useDashboardFetchRequired';

const QUERY_KEY = ['/api/v2/dashboards/dash-1'];
const mockRefetch = jest.fn();
let mockSource: DashboardQuerySource | null;

jest.mock(
	'pages/DashboardPage/DashboardContainer/store/useDashboardStore',
	() => ({
		useDashboardStore: (
			selector: (s: {
				dashboardId: string;
				dashboardQuerySource: DashboardQuerySource | null;
				refetch: () => void;
			}) => unknown,
		): unknown =>
			selector({
				dashboardId: 'dash-1',
				dashboardQuerySource: mockSource,
				refetch: mockRefetch,
			}),
	}),
);

function textVariable(name: string): DashboardtypesVariableDTO {
	return {
		kind: TextVariableKind.TextVariable,
		spec: { name, display: { name }, value: '' },
	};
}

function dashboardWith(
	spec: Partial<DashboardtypesGettableDashboardV2DTO['spec']>,
): DashboardtypesGettableDashboardV2DTO {
	return { id: 'dash-1', spec } as DashboardtypesGettableDashboardV2DTO;
}

function renderWithCache(
	cached?: unknown,
): ReturnType<
	typeof renderHook<ReturnType<typeof useDashboardFetchRequired>, void>
> {
	const queryClient = new QueryClient();
	if (cached !== undefined) {
		queryClient.setQueryData(mockSource?.queryKey ?? QUERY_KEY, cached);
	}
	return renderHook(() => useDashboardFetchRequired(), {
		wrapper: ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	});
}

describe('useDashboardFetchRequired', () => {
	beforeEach(() => {
		mockSource = null;
	});

	it('reads the dashboards API entry when the host sets no source', () => {
		const variables = [textVariable('region'), textVariable('tier')];
		const dashboard = dashboardWith({ variables });

		const { result } = renderWithCache({ data: dashboard, status: 'success' });

		expect(result.current.dashboard).toBe(dashboard);
		expect(result.current.variables).toBe(variables);
		expect(result.current.refetch).toBe(mockRefetch);
	});

	it("reads a host's own cache entry through its select", () => {
		const systemDashboard = { name: 'ai-o11y-overview', spec: {} };
		mockSource = {
			queryKey: ['/api/v2/dashboards/system/ai-o11y-overview'],
			select: (response: { data: typeof systemDashboard }) =>
				({
					...response.data,
					id: 'system-id',
				}) as DashboardtypesGettableDashboardV2DTO,
		};

		const { result } = renderWithCache({ data: systemDashboard });

		expect(result.current.dashboard).toStrictEqual({
			name: 'ai-o11y-overview',
			spec: {},
			id: 'system-id',
		});
	});

	it('normalizes variables to an empty array when the spec has none', () => {
		const { result } = renderWithCache({ data: dashboardWith({}) });

		expect(result.current.variables).toStrictEqual([]);
	});

	it('throws when the source entry is empty', () => {
		// Suppress React's expected render-error logging for this case.
		const consoleError = jest
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);

		expect(() => renderWithCache()).toThrow(/outside a loaded dashboard subtree/);

		consoleError.mockRestore();
	});
});
