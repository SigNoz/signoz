import { act, renderHook } from '@testing-library/react';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import { useVariableListActions } from '../hooks/useVariableListActions';
import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../variableFormModel';

jest.mock('../../../store/useDashboardStore', () => ({
	useDashboardStore: (
		selector: (s: { dashboardId: string }) => unknown,
	): unknown => selector({ dashboardId: 'd1' }),
}));
jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));
jest.mock('@signozhq/ui/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

function builderPanel(name: string, expression: string): unknown {
	return {
		spec: {
			display: { name },
			queries: [
				{
					spec: {
						plugin: { kind: 'signoz/BuilderQuery', spec: { filter: { expression } } },
					},
				},
			],
		},
	};
}

function dashboard(
	panels: Record<string, unknown>,
): DashboardtypesGettableDashboardV2DTO {
	return {
		spec: { panels, variables: [] },
	} as unknown as DashboardtypesGettableDashboardV2DTO;
}

function dynamicVar(name: string, attribute: string): VariableFormModel {
	return {
		...emptyVariableFormModel(),
		name,
		type: 'DYNAMIC',
		dynamicAttribute: attribute,
	};
}

function renderActions(
	dash: DashboardtypesGettableDashboardV2DTO,
	variables: VariableFormModel[],
) {
	return renderHook(() =>
		useVariableListActions({
			dashboard: dash,
			variables,
			setVariables: jest.fn(),
			isEditing: null,
			setIsEditing: jest.fn(),
			save: jest.fn().mockResolvedValue(true),
			patchAsync: jest.fn().mockResolvedValue(undefined),
		}),
	);
}

describe('useVariableListActions — apply to all', () => {
	it('marks a variable applied-to-all only when every panel already references it', () => {
		const notApplied = renderActions(dashboard({ p1: builderPanel('P1', '') }), [
			dynamicVar('pod', 'k8s.pod.name'),
		]);
		expect(notApplied.result.current.appliedToAllNames.has('pod')).toBe(false);

		const applied = renderActions(
			dashboard({ p1: builderPanel('P1', 'k8s.pod.name IN $pod') }),
			[dynamicVar('pod', 'k8s.pod.name')],
		);
		expect(applied.result.current.appliedToAllNames.has('pod')).toBe(true);
	});

	it('requestApplyToAll opens an apply-mode impact for all panels', () => {
		const { result } = renderActions(
			dashboard({ p1: builderPanel('P1', ''), p2: builderPanel('P2', '') }),
			[dynamicVar('pod', 'k8s.pod.name')],
		);

		act(() => result.current.requestApplyToAll(0));

		const { impact } = result.current;
		expect(impact?.mode).toBe('apply');
		expect(impact?.origin).toBe('applyToAll');
		expect(impact?.variableName).toBe('pod');
		expect(impact?.usages.map((u) => u.sourceId).sort()).toStrictEqual([
			'p1',
			'p2',
		]);
	});

	it('requestApplyToAll is a no-op when nothing is left to apply', () => {
		const { result } = renderActions(
			dashboard({ p1: builderPanel('P1', 'k8s.pod.name IN $pod') }),
			[dynamicVar('pod', 'k8s.pod.name')],
		);

		act(() => result.current.requestApplyToAll(0));
		expect(result.current.impact).toBeNull();
	});
});
