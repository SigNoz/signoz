import {
	invalidateGetMetricReductionRule,
	invalidateListMetricReductionRules,
	invalidateListMetrics,
	useDeleteMetricReductionRule,
	useGetMetricAttributes,
	usePreviewMetricReductionRule,
	useUpsertMetricReductionRule,
} from 'api/generated/services/metrics';
import {
	MetricreductionruletypesGettableReductionRulePreviewDTO,
	MetricreductionruletypesGettableReductionRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useNotifications } from 'hooks/useNotifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { matchTypeForMode, modeFromRule } from './configUtils';
import { RuleMode } from './types';

interface UseVolumeControlConfigParams {
	metricName: string;
	existingRule: MetricreductionruletypesGettableReductionRuleDTO | null;
	open: boolean;
	onClose: () => void;
}

export interface UseVolumeControlConfigResult {
	mode: RuleMode;
	setMode: (mode: RuleMode) => void;
	labels: string[];
	setLabels: (labels: string[]) => void;
	attributeKeys: string[];
	isLoadingAttributes: boolean;
	preview?: MetricreductionruletypesGettableReductionRulePreviewDTO;
	isPreviewLoading: boolean;
	save: () => void;
	remove: () => void;
	isSaving: boolean;
	isRemoving: boolean;
	hasExistingRule: boolean;
	isSaveDisabled: boolean;
}

const PREVIEW_DEBOUNCE_MS = 400;
const SAVE_ERROR_MESSAGE = 'Failed to save volume control rule';
const REMOVE_ERROR_MESSAGE = 'Failed to remove volume control rule';

export function useVolumeControlConfig({
	metricName,
	existingRule,
	open,
	onClose,
}: UseVolumeControlConfigParams): UseVolumeControlConfigResult {
	const { notifications } = useNotifications();
	const queryClient = useQueryClient();
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const initial = useMemo(() => modeFromRule(existingRule), [existingRule]);
	const [mode, setMode] = useState<RuleMode>(initial.mode);
	const [labels, setLabels] = useState<string[]>(initial.labels);

	const attributesQuery = useGetMetricAttributes(
		{ metricName },
		{
			start: minTime ? Math.floor(minTime / 1000000) : undefined,
			end: maxTime ? Math.floor(maxTime / 1000000) : undefined,
		},
		{ query: { enabled: open && !!metricName } },
	);
	const attributeKeys = useMemo(
		() => (attributesQuery.data?.data.attributes ?? []).map((attr) => attr.key),
		[attributesQuery.data],
	);

	const previewMutation = usePreviewMetricReductionRule();
	const { mutate: previewMutate, reset: previewReset } = previewMutation;
	const [isPreviewPending, setIsPreviewPending] = useState(false);

	useEffect(() => {
		if (!open || mode === 'all' || labels.length === 0) {
			previewReset();
			setIsPreviewPending(false);
			return undefined;
		}
		setIsPreviewPending(true);
		const timer = setTimeout(() => {
			previewMutate(
				{ data: { metricName, matchType: matchTypeForMode(mode), labels } },
				{ onSettled: () => setIsPreviewPending(false) },
			);
		}, PREVIEW_DEBOUNCE_MS);
		return (): void => clearTimeout(timer);
	}, [open, mode, labels, metricName, previewMutate, previewReset]);

	const upsertMutation = useUpsertMetricReductionRule();
	const deleteMutation = useDeleteMetricReductionRule();

	const invalidate = useCallback((): void => {
		void invalidateGetMetricReductionRule(queryClient, { metricName });
		void invalidateListMetricReductionRules(queryClient);
		void invalidateListMetrics(queryClient);
	}, [queryClient, metricName]);

	const removeRule = useCallback((): void => {
		deleteMutation.mutate(
			{ pathParams: { metricName } },
			{
				onSuccess: () => {
					notifications.success({ message: 'Volume control rule removed' });
					invalidate();
					onClose();
				},
				onError: (error) =>
					notifications.error({
						message: error.response?.data?.error?.message ?? REMOVE_ERROR_MESSAGE,
					}),
			},
		);
	}, [deleteMutation, metricName, notifications, invalidate, onClose]);

	const save = useCallback((): void => {
		if (mode === 'all') {
			if (!existingRule) {
				onClose();
				return;
			}
			removeRule();
			return;
		}
		upsertMutation.mutate(
			{
				pathParams: { metricName },
				data: { matchType: matchTypeForMode(mode), labels },
			},
			{
				onSuccess: () => {
					notifications.success({ message: 'Volume control rule saved' });
					invalidate();
					onClose();
				},
				onError: (error) =>
					notifications.error({
						message: error.response?.data?.error?.message ?? SAVE_ERROR_MESSAGE,
					}),
			},
		);
	}, [
		mode,
		labels,
		metricName,
		existingRule,
		upsertMutation,
		removeRule,
		notifications,
		invalidate,
		onClose,
	]);

	return {
		mode,
		setMode,
		labels,
		setLabels,
		attributeKeys,
		isLoadingAttributes: attributesQuery.isLoading,
		preview: previewMutation.data?.data,
		isPreviewLoading: isPreviewPending,
		save,
		remove: removeRule,
		isSaving: upsertMutation.isLoading || deleteMutation.isLoading,
		isRemoving: deleteMutation.isLoading,
		hasExistingRule: !!existingRule,
		isSaveDisabled: mode !== 'all' && labels.length === 0,
	};
}
