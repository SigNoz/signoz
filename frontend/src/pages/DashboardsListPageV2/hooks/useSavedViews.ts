import { useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import {
	invalidateListDashboardViews,
	useCreateDashboardView,
	useDeleteDashboardView,
	useListDashboardViews,
	useUpdateDashboardView,
} from 'api/generated/services/dashboard';
import {
	type DashboardtypesDashboardViewDTO,
	DashboardtypesListOrderDTO,
	DashboardtypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';

import type { SavedView, SavedViewInput } from '../types';

// Schema version stamped on the view's data envelope (the backend requires it).
const VIEW_DATA_VERSION = 'v1';

const toSavedView = (dto: DashboardtypesDashboardViewDTO): SavedView => ({
	id: dto.id,
	name: dto.name,
	query: dto.data.query ?? '',
	sort: dto.data.sort ?? DashboardtypesListSortDTO.updated_at,
	order: dto.data.order ?? DashboardtypesListOrderDTO.desc,
});

const toPostable = (
	input: SavedViewInput,
): { name: string; data: DashboardtypesDashboardViewDTO['data'] } => ({
	name: input.name.trim(),
	data: {
		version: VIEW_DATA_VERSION,
		query: input.query,
		sort: input.sort,
		order: input.order,
	},
});

export interface UseSavedViewsResult {
	views: SavedView[];
	isLoading: boolean;
	createView: (input: SavedViewInput) => Promise<SavedView | null>;
	updateView: (id: string, input: SavedViewInput) => void;
	deleteView: (id: string) => void;
}

// Org-shared saved views, backed by the Views API. Exposes the list plus
// create/update/delete that invalidate the list on success.
export function useSavedViews(): UseSavedViewsResult {
	const queryClient = useQueryClient();
	const { data, isLoading } = useListDashboardViews();

	const views = useMemo<SavedView[]>(
		() => (data?.data?.views ?? []).map(toSavedView),
		[data],
	);

	const invalidate = useCallback((): void => {
		void invalidateListDashboardViews(queryClient);
	}, [queryClient]);

	const createMutation = useCreateDashboardView({
		mutation: {
			onSuccess: invalidate,
			onError: (): void => {
				toast.error('Failed to save view.');
			},
		},
	});
	const updateMutation = useUpdateDashboardView({
		mutation: {
			onSuccess: invalidate,
			onError: (): void => {
				toast.error('Failed to update view.');
			},
		},
	});
	const deleteMutation = useDeleteDashboardView({
		mutation: {
			onSuccess: invalidate,
			onError: (): void => {
				toast.error('Failed to delete view.');
			},
		},
	});

	const createView = useCallback(
		async (input: SavedViewInput): Promise<SavedView | null> => {
			try {
				const res = await createMutation.mutateAsync({ data: toPostable(input) });
				return res?.data ? toSavedView(res.data) : null;
			} catch {
				return null;
			}
		},
		[createMutation],
	);

	const updateView = useCallback(
		(id: string, input: SavedViewInput): void => {
			updateMutation.mutate({ pathParams: { id }, data: toPostable(input) });
		},
		[updateMutation],
	);

	const deleteView = useCallback(
		(id: string): void => {
			deleteMutation.mutate({ pathParams: { id } });
		},
		[deleteMutation],
	);

	return { views, isLoading, createView, updateView, deleteView };
}
