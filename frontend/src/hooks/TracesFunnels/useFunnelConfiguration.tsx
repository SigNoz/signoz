import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import useDebounce from 'hooks/useDebounce';
import { useNotifications } from 'hooks/useNotifications';
import { isEqual } from 'lodash-es';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { FunnelData, FunnelStepData } from 'types/api/traceFunnels';

import { useUpdateFunnelSteps } from './useFunnels';

interface UseFunnelConfiguration {
	isPopoverOpen: boolean;
	setIsPopoverOpen: (isPopoverOpen: boolean) => void;
	steps: FunnelStepData[];
}

// Add this helper function
const normalizeSteps = (steps: FunnelStepData[]): FunnelStepData[] => {
	if (steps.some((step) => !step.filters)) return steps;

	return steps.map((step) => ({
		...step,
		filters: {
			...step.filters,
			items: step.filters.items.map((item) => ({
				id: '',
				key: item.key,
				value: item.value,
				op: item.op,
			})),
		},
	}));
};

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function useFunnelConfiguration({
	funnel,
	disableAutoSave = false,
	triggerAutoSave = false,
	showNotifications = false,
}: {
	funnel: FunnelData;
	disableAutoSave?: boolean;
	triggerAutoSave?: boolean;
	showNotifications?: boolean;
}): UseFunnelConfiguration {
	const { notifications } = useNotifications();
	const {
		steps,
		initialSteps,
		hasIncompleteStepFields,
		handleRestoreSteps,
		handleRunFunnel,
	} = useFunnelContext();

	// State management
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);

	const debouncedSteps = useDebounce(steps, 200);

	const [lastValidatedSteps, setLastValidatedSteps] = useState<FunnelStepData[]>(
		initialSteps,
	);

	// Mutation hooks
	const updateStepsMutation = useUpdateFunnelSteps(
		funnel.funnel_id,
		notifications,
	);

	// Derived state
	const lastSavedStepsStateRef = useRef<FunnelStepData[]>(steps);

	const hasStepsChanged = useCallback(() => {
		const normalizedLastSavedSteps = normalizeSteps(
			lastSavedStepsStateRef.current,
		);
		const normalizedDebouncedSteps = normalizeSteps(debouncedSteps);
		return !isEqual(normalizedDebouncedSteps, normalizedLastSavedSteps);
	}, [debouncedSteps]);

	const hasFunnelStepDefinitionsChanged = useCallback(
		(prevSteps: FunnelStepData[], nextSteps: FunnelStepData[]): boolean => {
			if (prevSteps.length !== nextSteps.length) return true;
			return prevSteps.some((step, index) => {
				const nextStep = nextSteps[index];
				return (
					step.service_name !== nextStep.service_name ||
					step.span_name !== nextStep.span_name ||
					!isEqual(step.filters, nextStep.filters) ||
					step.has_errors !== nextStep.has_errors ||
					step.latency_pointer !== nextStep.latency_pointer
				);
			});
		},
		[],
	);

	const hasFunnelLatencyTypeChanged = useCallback(
		(prevSteps: FunnelStepData[], nextSteps: FunnelStepData[]): boolean =>
			prevSteps.some((step, index) => {
				const nextStep = nextSteps[index];
				return step.latency_type !== nextStep.latency_type;
			}),
		[],
	);

	// Mutation payload preparation
	const getUpdatePayload = useCallback(
		() => ({
			funnel_id: funnel.funnel_id,
			steps: debouncedSteps,
			timestamp: Date.now(),
		}),
		[funnel.funnel_id, debouncedSteps],
	);

	const queryClient = useQueryClient();
	const { selectedTime } = useFunnelContext();

	const validateStepsQueryKey = useMemo(
		() => [REACT_QUERY_KEY.VALIDATE_FUNNEL_STEPS, funnel.funnel_id, selectedTime],
		[funnel.funnel_id, selectedTime],
	);
	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		// Determine if we should save based on the mode
		let shouldSave = false;

		if (disableAutoSave) {
			// Manual save mode: only save when explicitly triggered
			shouldSave = triggerAutoSave;
		} else {
			// Auto-save mode: save when steps have changed and no incomplete fields
			shouldSave = hasStepsChanged() && !hasIncompleteStepFields;
		}

		if (shouldSave && !isEqual(debouncedSteps, lastValidatedSteps)) {
			updateStepsMutation.mutate(getUpdatePayload(), {
				onSuccess: (data) => {
					const updatedFunnelSteps = data?.payload?.steps;

					if (!updatedFunnelSteps) return;

					queryClient.setQueryData(
						[REACT_QUERY_KEY.GET_FUNNEL_DETAILS, funnel.funnel_id],
						(oldData: any) => {
							if (!oldData?.payload) return oldData;
							return {
								...oldData,
								payload: {
									...oldData.payload,
									steps: updatedFunnelSteps,
								},
							};
						},
					);

					lastSavedStepsStateRef.current = updatedFunnelSteps;

					const hasIncompleteStepFields = updatedFunnelSteps.some(
						(step) => step.service_name === '' || step.span_name === '',
					);

					if (hasFunnelLatencyTypeChanged(lastValidatedSteps, debouncedSteps)) {
						handleRunFunnel();
						setLastValidatedSteps(debouncedSteps);
					}
					// Only validate if funnel steps definitions
					else if (
						!hasIncompleteStepFields &&
						hasFunnelStepDefinitionsChanged(lastValidatedSteps, debouncedSteps)
					) {
						queryClient.refetchQueries(validateStepsQueryKey);
						setLastValidatedSteps(debouncedSteps);
					}

					// Show success notification only when requested
					if (showNotifications) {
						notifications.success({
							message: 'Success',
							description: 'Funnel configuration updated successfully',
						});
					}
				},

				onError: (error: any) => {
					handleRestoreSteps(lastSavedStepsStateRef.current);
					queryClient.setQueryData(
						[REACT_QUERY_KEY.GET_FUNNEL_DETAILS, funnel.funnel_id],
						(oldData: any) => ({
							...oldData,
							payload: {
								...oldData.payload,
								steps: lastSavedStepsStateRef.current,
							},
						}),
					);

					// Show error notification only when requested
					if (showNotifications) {
						notifications.error({
							message: 'Failed to update funnel',
							description:
								error?.message ||
								'An error occurred while updating the funnel configuration',
						});
					}
				},
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		debouncedSteps,
		getUpdatePayload,
		hasFunnelStepDefinitionsChanged,
		hasStepsChanged,
		lastValidatedSteps,
		queryClient,
		validateStepsQueryKey,
		triggerAutoSave,
		showNotifications,
		disableAutoSave,
	]);

	return {
		isPopoverOpen,
		setIsPopoverOpen,
		steps,
	};
}
