import { act, renderHook } from '@testing-library/react';
import { updateDashboardV2 } from 'api/generated/services/dashboard';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { toast } from '@signozhq/ui/sonner';

import { useJsonEditor } from '../useJsonEditor';

const mockRefetch = jest.fn();
const mockShowErrorModal = jest.fn();

jest.mock('../../../store/useDashboardStore', () => ({
	useDashboardStore: (selector: (state: unknown) => unknown): unknown =>
		selector({ dashboardId: 'dash-1', refetch: mockRefetch }),
}));

jest.mock('providers/ErrorModalProvider', () => ({
	useErrorModal: (): { showErrorModal: jest.Mock } => ({
		showErrorModal: mockShowErrorModal,
	}),
}));

jest.mock('api/generated/services/dashboard', () => ({
	updateDashboardV2: jest.fn(),
}));

jest.mock('@signozhq/ui/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const mockUpdate = updateDashboardV2 as jest.Mock;
const mockToastSuccess = toast.success as jest.Mock;

const dashboard = {
	id: 'dash-1',
	name: 'My dashboard',
	schemaVersion: 'v6',
	image: 'icon.png',
	tags: [{ key: 'env', value: 'prod' }],
	spec: {
		display: { name: 'My dashboard' },
		panels: {},
		layouts: [],
		variables: [],
	},
} as unknown as DashboardtypesGettableDashboardV2DTO;

// The editor only exposes `tags` and `spec`; every other key is redacted.
const redacted = { tags: dashboard.tags, spec: dashboard.spec };
const serialized = JSON.stringify(redacted, null, 2);

describe('useJsonEditor', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUpdate.mockResolvedValue({});
	});

	it('seeds the draft from the dashboard and reports valid, non-dirty state', () => {
		const { result } = renderHook(() =>
			useJsonEditor({ dashboard, isOpen: true, onApplied: jest.fn() }),
		);

		expect(result.current.draft).toBe(serialized);
		expect(result.current.isDirty).toBe(false);
		expect(result.current.validity.valid).toBe(true);
		expect(result.current.validity.lineCount).toBe(serialized.split('\n').length);
	});

	it('redacts server-owned keys from the editable draft', () => {
		const { result } = renderHook(() =>
			useJsonEditor({ dashboard, isOpen: true, onApplied: jest.fn() }),
		);

		const parsed = JSON.parse(result.current.draft);
		expect(Object.keys(parsed).sort()).toStrictEqual(['spec', 'tags']);
		expect(parsed.id).toBeUndefined();
		expect(parsed.name).toBeUndefined();
		expect(parsed.schemaVersion).toBeUndefined();
		expect(parsed.image).toBeUndefined();
	});

	it('flags invalid JSON with a line number and marks the draft dirty', () => {
		const { result } = renderHook(() =>
			useJsonEditor({ dashboard, isOpen: true, onApplied: jest.fn() }),
		);

		act(() => result.current.setDraft('{\n  "name": ,\n}'));

		expect(result.current.validity.valid).toBe(false);
		expect(result.current.validity.message).toBeDefined();
		expect(result.current.isDirty).toBe(true);
	});

	it('format() pretty-prints valid JSON and leaves invalid JSON untouched', () => {
		const { result } = renderHook(() =>
			useJsonEditor({ dashboard, isOpen: true, onApplied: jest.fn() }),
		);

		act(() => result.current.setDraft('{"a":1}'));
		act(() => result.current.format());
		expect(result.current.draft).toBe('{\n  "a": 1\n}');

		act(() => result.current.setDraft('{bad'));
		act(() => result.current.format());
		expect(result.current.draft).toBe('{bad');
	});

	it('reset() restores the last-applied text', () => {
		const { result } = renderHook(() =>
			useJsonEditor({ dashboard, isOpen: true, onApplied: jest.fn() }),
		);

		act(() => result.current.setDraft('edited'));
		expect(result.current.isDirty).toBe(true);

		act(() => result.current.reset());
		expect(result.current.draft).toBe(serialized);
		expect(result.current.isDirty).toBe(false);
	});

	it('apply() is a no-op when the draft is unchanged or invalid', async () => {
		const { result } = renderHook(() =>
			useJsonEditor({ dashboard, isOpen: true, onApplied: jest.fn() }),
		);

		await act(async () => {
			await result.current.apply();
		});
		expect(mockUpdate).not.toHaveBeenCalled();

		act(() => result.current.setDraft('{bad'));
		await act(async () => {
			await result.current.apply();
		});
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('apply() PUTs the edited spec/tags while preserving redacted keys, toasts, refetches and calls onApplied', async () => {
		const onApplied = jest.fn();
		const { result } = renderHook(() =>
			useJsonEditor({ dashboard, isOpen: true, onApplied }),
		);

		// Edit only what the redacted view exposes (spec/tags).
		const editedSpec = {
			...dashboard.spec,
			display: { name: 'Renamed' },
		};
		const editedTags = [{ key: 'env', value: 'staging' }];
		act(() =>
			result.current.setDraft(
				JSON.stringify({ tags: editedTags, spec: editedSpec }),
			),
		);
		await act(async () => {
			await result.current.apply();
		});

		expect(mockUpdate).toHaveBeenCalledTimes(1);
		expect(mockUpdate).toHaveBeenCalledWith(
			{ id: 'dash-1' },
			expect.objectContaining({
				// preserved from the original dashboard (redacted from the editor)
				name: 'My dashboard',
				schemaVersion: 'v6',
				image: 'icon.png',
				// edited via the draft
				spec: editedSpec,
				tags: editedTags,
			}),
		);
		expect(mockToastSuccess).toHaveBeenCalled();
		expect(mockRefetch).toHaveBeenCalled();
		expect(onApplied).toHaveBeenCalled();
	});

	it('apply() surfaces errors through the error modal', async () => {
		mockUpdate.mockRejectedValueOnce(new Error('boom'));
		const { result } = renderHook(() =>
			useJsonEditor({ dashboard, isOpen: true, onApplied: jest.fn() }),
		);

		act(() =>
			result.current.setDraft(JSON.stringify({ ...dashboard, name: 'X' })),
		);
		await act(async () => {
			await result.current.apply();
		});

		expect(mockShowErrorModal).toHaveBeenCalled();
	});

	it('re-seeds the draft when the drawer re-opens', () => {
		const onApplied = jest.fn();
		const { result, rerender } = renderHook(
			(props: { isOpen: boolean }) =>
				useJsonEditor({ dashboard, isOpen: props.isOpen, onApplied }),
			{ initialProps: { isOpen: false } },
		);

		act(() => result.current.setDraft('stale edit'));
		expect(result.current.draft).toBe('stale edit');

		rerender({ isOpen: true });
		expect(result.current.draft).toBe(serialized);
	});

	it('reports panels not placed in any layout as dangling', () => {
		const withDangling = {
			...dashboard,
			spec: { ...dashboard.spec, panels: { p1: {} }, layouts: [] },
		} as unknown as DashboardtypesGettableDashboardV2DTO;
		const { result } = renderHook(() =>
			useJsonEditor({
				dashboard: withDangling,
				isOpen: true,
				onApplied: jest.fn(),
			}),
		);

		expect(result.current.danglingPanelIds).toStrictEqual(['p1']);
		expect(result.current.missingPanelRefs).toStrictEqual([]);
	});

	it('reports layout refs to panels that no longer exist as missing', () => {
		const withMissing = {
			...dashboard,
			spec: {
				...dashboard.spec,
				panels: {},
				layouts: [
					{
						kind: 'Grid',
						spec: { items: [{ content: { $ref: '#/spec/panels/ghost' } }] },
					},
				],
			},
		} as unknown as DashboardtypesGettableDashboardV2DTO;
		const { result } = renderHook(() =>
			useJsonEditor({
				dashboard: withMissing,
				isOpen: true,
				onApplied: jest.fn(),
			}),
		);

		expect(result.current.missingPanelRefs).toStrictEqual(['ghost']);
		expect(result.current.danglingPanelIds).toStrictEqual([]);
	});
});
