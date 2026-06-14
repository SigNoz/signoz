import { act, renderHook } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';

import { usePanelEditorDraft } from '../usePanelEditorDraft';

function panel(name = 'CPU', description = 'usage'): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			display: { name, description },
			plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
			queries: [],
		},
	} as unknown as DashboardtypesPanelDTO;
}

describe('usePanelEditorDraft', () => {
	it('seeds display from the initial panel and starts clean', () => {
		const { result } = renderHook(() => usePanelEditorDraft(panel()));

		expect(result.current.display).toStrictEqual({
			name: 'CPU',
			description: 'usage',
		});
		expect(result.current.isDirty).toBe(false);
	});

	it('updates display and flags the draft dirty', () => {
		const { result } = renderHook(() => usePanelEditorDraft(panel()));

		act(() => result.current.setDisplay({ name: 'Memory' }));

		expect(result.current.display.name).toBe('Memory');
		expect(result.current.display.description).toBe('usage');
		expect(result.current.isDirty).toBe(true);
		// draft stays in perses shape so preview + save consume it directly
		expect(result.current.draft.spec?.display?.name).toBe('Memory');
	});

	it('reset restores the originally-loaded display', () => {
		const { result } = renderHook(() => usePanelEditorDraft(panel()));

		act(() => result.current.setDisplay({ name: 'Memory', description: 'new' }));
		act(() => result.current.reset());

		expect(result.current.display).toStrictEqual({
			name: 'CPU',
			description: 'usage',
		});
		expect(result.current.isDirty).toBe(false);
	});

	it('treats a panel without display as empty strings', () => {
		const bare = {
			kind: 'Panel',
			spec: { plugin: { kind: 'signoz/PieChartPanel' } },
		} as unknown as DashboardtypesPanelDTO;
		const { result } = renderHook(() => usePanelEditorDraft(bare));

		expect(result.current.display).toStrictEqual({ name: '', description: '' });
	});

	it('exposes the panel spec and flags dirty on a spec (non-display) edit', () => {
		const { result } = renderHook(() => usePanelEditorDraft(panel()));

		expect(result.current.spec).toBe(result.current.draft.spec);

		act(() =>
			result.current.setSpec({
				...result.current.spec,
				plugin: {
					kind: 'signoz/TimeSeriesPanel',
					spec: { formatting: { unit: 'bytes' } },
				},
			} as typeof result.current.spec),
		);

		expect(result.current.isDirty).toBe(true);
		expect(
			(
				result.current.draft.spec?.plugin?.spec as {
					formatting?: { unit?: string };
				}
			)?.formatting?.unit,
		).toBe('bytes');
	});

	it('reset restores the spec and clears dirty after a spec edit', () => {
		const { result } = renderHook(() => usePanelEditorDraft(panel()));

		act(() =>
			result.current.setSpec({
				...result.current.spec,
				plugin: {
					kind: 'signoz/TimeSeriesPanel',
					spec: { formatting: { unit: 'ms' } },
				},
			} as typeof result.current.spec),
		);
		act(() => result.current.reset());

		expect(result.current.isDirty).toBe(false);
	});
});
