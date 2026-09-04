import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useSeededDashboardV2 } from '../useSeededDashboardV2';

describe('useSeededDashboardV2', () => {
	it('seeds and returns the AI Observability overview dashboard with dual attribute filters', () => {
		const queryClient = new QueryClient();
		const wrapper = ({
			children,
		}: {
			children: React.ReactNode;
		}): JSX.Element => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		const { result } = renderHook(() => useSeededDashboardV2(), { wrapper });

		expect(result.current.dashboard).toBeDefined();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const rawDashboard = result.current.dashboard as any;
		expect(rawDashboard.spec?.display?.name).toContain('AI Observability');

		const providerFilterExpressions: string[] = [];
		const panels = rawDashboard.spec?.panels || {};
		for (const panelKey of Object.keys(panels)) {
			const panel = panels[panelKey];
			const queries = panel.spec?.queries || [];
			for (const q of queries) {
				const expr = q.spec?.plugin?.spec?.queries?.[0]?.spec?.filter?.expression;
				if (
					expr &&
					(expr.includes('gen_ai.system') || expr.includes('gen_ai.provider.name'))
				) {
					providerFilterExpressions.push(expr);
				}
			}
		}

		// Ensure all 6 provider span filters cover both gen_ai.system and gen_ai.provider.name
		expect(providerFilterExpressions).toHaveLength(6);
		for (const expr of providerFilterExpressions) {
			expect(expr).toContain('gen_ai.system');
			expect(expr).toContain('gen_ai.provider.name');
		}
	});
});
