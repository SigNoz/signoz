import { useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	getListRuleViewsQueryKey,
	invalidateListRuleViews,
	useCreateRuleView,
	useDeleteRuleView,
	useListRuleViews,
	useUpdateRuleView,
} from 'api/generated/services/rules';
import type {
	ListRuleViews200,
	RenderErrorResponseDTO,
	RuletypesPostableRuleViewDTO,
	RuletypesRuleViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { AxiosError } from 'axios';
import type { SavedListViewsApi } from 'components/ListViews/types';

import type { RuleListFilter, RuleView } from './types';
import { DEFAULT_RULE_LIST_ORDER, DEFAULT_RULE_LIST_SORT } from './utils';

// Schema version stamped on the view's data envelope (the backend requires it).
const VIEW_DATA_VERSION = 'v1';

const toRuleView = (dto: RuletypesRuleViewDTO): RuleView => ({
	id: dto.id,
	name: dto.name,
	filter: {
		query: dto.data.query ?? '',
		states: dto.data.states ?? [],
		sort: dto.data.sort ?? DEFAULT_RULE_LIST_SORT,
		order: dto.data.order ?? DEFAULT_RULE_LIST_ORDER,
	},
});

const toPostable = (
	name: string,
	filter: RuleListFilter,
): RuletypesPostableRuleViewDTO => ({
	name: name.trim(),
	data: {
		version: VIEW_DATA_VERSION,
		query: filter.query.trim(),
		states: filter.states,
		sort: filter.sort,
		order: filter.order,
	},
});

const toastApiError =
	(fallback: string) =>
	(error: unknown): void => {
		const apiError = convertToApiError(
			error as AxiosError<RenderErrorResponseDTO>,
		);
		toast.error(apiError?.getErrorMessage() || fallback);
	};

/** Org-shared saved views for the alert rules list, backed by the rule views API. */
export function useRuleViews(): SavedListViewsApi<RuleListFilter> {
	const queryClient = useQueryClient();
	const { data, isLoading } = useListRuleViews();

	const views = useMemo<RuleView[]>(
		() => (data?.data?.views ?? []).map(toRuleView),
		[data],
	);

	const invalidate = useCallback((): void => {
		void invalidateListRuleViews(queryClient);
	}, [queryClient]);

	const createMutation = useCreateRuleView({
		mutation: {
			onSuccess: invalidate,
			onError: toastApiError('Failed to save view.'),
		},
	});
	// Update returns the full view, so patch it into the cached list instead of refetching.
	const updateMutation = useUpdateRuleView({
		mutation: {
			onSuccess: (response): void => {
				const updated = response?.data;
				const key = getListRuleViewsQueryKey();
				const prev = queryClient.getQueryData<ListRuleViews200>(key);
				if (!updated || !prev) {
					return;
				}
				queryClient.setQueryData<ListRuleViews200>(key, {
					...prev,
					data: {
						...prev.data,
						views: (prev.data.views ?? []).map((v) =>
							v.id === updated.id ? updated : v,
						),
					},
				});
			},
			onError: toastApiError('Failed to update view.'),
		},
	});
	const deleteMutation = useDeleteRuleView({
		mutation: {
			onSuccess: invalidate,
			onError: toastApiError('Failed to delete view.'),
		},
	});

	const createView = useCallback(
		async (name: string, filter: RuleListFilter): Promise<RuleView | null> => {
			try {
				const res = await createMutation.mutateAsync({
					data: toPostable(name, filter),
				});
				return res?.data ? toRuleView(res.data) : null;
			} catch {
				return null;
			}
		},
		[createMutation],
	);

	const updateView = useCallback(
		(id: string, name: string, filter: RuleListFilter): void => {
			updateMutation.mutate({
				pathParams: { id },
				data: toPostable(name, filter),
			});
		},
		[updateMutation],
	);

	const deleteView = useCallback(
		(id: string): Promise<void> =>
			deleteMutation.mutateAsync({ pathParams: { id } }).then(() => undefined),
		[deleteMutation],
	);

	return { views, isLoading, createView, updateView, deleteView };
}
