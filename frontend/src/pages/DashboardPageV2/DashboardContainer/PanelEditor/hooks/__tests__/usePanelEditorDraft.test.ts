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
	it('exposes the panel spec and starts clean', () => {
		const { result } = renderHook(() => usePanelEditorDraft(panel()));

		expect(result.current.spec).toBe(result.current.draft.spec);
		expect(result.current.spec.display?.name).toBe('CPU');
		expect(result.current.isSpecDirty).toBe(false);
	});

	it('flags dirty and writes through on a display (title) edit via setSpec', () => {
		const { result } = renderHook(() => usePanelEditorDraft(panel()));

		act(() =>
			result.current.setSpec({
				...result.current.spec,
				display: { ...result.current.spec.display, name: 'Memory' },
			}),
		);

		expect(result.current.isSpecDirty).toBe(true);
		expect(result.current.draft.spec?.display?.name).toBe('Memory');
	});

	it('flags dirty on a plugin-spec (non-display) edit', () => {
		const { result } = renderHook(() => usePanelEditorDraft(panel()));

		act(() =>
			result.current.setSpec({
				...result.current.spec,
				plugin: {
					kind: 'signoz/TimeSeriesPanel',
					spec: { formatting: { unit: 'bytes' } },
				},
			} as typeof result.current.spec),
		);

		expect(result.current.isSpecDirty).toBe(true);
		expect(
			(
				result.current.draft.spec?.plugin?.spec as {
					formatting?: { unit?: string };
				}
			)?.formatting?.unit,
		).toBe('bytes');
	});

	it('does not flag spec-dirty when only spec.queries changes (owned by the builder)', () => {
		const { result } = renderHook(() => usePanelEditorDraft(panel()));

		act(() =>
			result.current.setSpec({
				...result.current.spec,
				queries: [{ id: 'committed-by-builder' }],
			} as unknown as typeof result.current.spec),
		);

		expect(result.current.isSpecDirty).toBe(false);
	});

	it('flags spec-dirty when the seed differs from the saved baseline (View handoff)', () => {
		// The editor opens on a handed-off, already-edited spec (`seed`) but compares
		// against the persisted panel (`saved`) — so it starts dirty, not clean.
		const seed = panel('Memory', 'usage');
		const saved = panel('CPU', 'usage');

		const { result } = renderHook(() => usePanelEditorDraft(seed, saved));

		expect(result.current.isSpecDirty).toBe(true);
	});

	it('is clean when the seed matches the saved baseline', () => {
		const { result } = renderHook(() =>
			usePanelEditorDraft(panel('CPU', 'usage'), panel('CPU', 'usage')),
		);

		expect(result.current.isSpecDirty).toBe(false);
	});

	it('reset restores the spec and clears dirty after an edit', () => {
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

		expect(result.current.isSpecDirty).toBe(false);
		expect(result.current.spec.display?.name).toBe('CPU');
	});
});
