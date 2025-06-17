import { LOCALSTORAGE } from 'constants/localStorage';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import useDebounce from 'hooks/useDebounce';
import { useLocalStorage } from 'hooks/useLocalStorage';
import { useNotifications } from 'hooks/useNotifications';
import { isEqual } from 'lodash-es';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { FunnelData, FunnelStepData } from 'types/api/traceFunnels';

import { useUpdateFunnelSteps } from './useFunnels';

interface UseFunnelConfiguration {
	isPopoverOpen: boolean;
	setIsPopoverOpen: (isPopoverOpen: boolean) => void;
	steps: FunnelStepData[];
	isSaving: boolean;
}

// Add this helper function
export const normalizeSteps = (steps: FunnelStepData[]): FunnelStepData[] => {
	if (steps.some((step) => !step.filters)) return steps;

	return steps.map((step) => ({
		...step,
		filters: {
			...step.filters,
			items: step.filters.items.map((item) => {
				const {
					id: unusedId,
					isIndexed,
					...keyObj
				} = item.key as BaseAutocompleteData;
				return {
					id: '',
					key: keyObj,
					value: item.value,
					op: item.op,
				};
			}),
		},
	}));
};

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function useFunnelConfiguration({
	funnel,
	triggerAutoSave = false,
	showNotifications = false,
}: {
	funnel: FunnelData;
	triggerAutoSave?: boolean;
	showNotifications?: boolean;
}): UseFunnelConfiguration {
	const { notifications } = useNotifications();
	const queryClient = useQueryClient();
	const {
		steps,
		lastUpdatedSteps,
		setLastUpdatedSteps,
		handleRestoreSteps,
		selectedTime,
		setIsUpdatingFunnel,
	} = useFunnelContext();

	// State management
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);

	const debouncedSteps = useDebounce(steps, 200);

	// Mutation hooks
	const updateStepsMutation = useUpdateFunnelSteps(
		funnel.funnel_id,
		notifications,
	);

	// Derived state
	const lastSavedStepsStateRef = useRef<FunnelStepData[]>(steps);
	const hasRestoredFromLocalStorage = useRef(false);

	// localStorage hook for funnel steps
	const localStorageKey = `${LOCALSTORAGE.FUNNEL_STEPS}_${funnel.funnel_id}`;
	const [
		localStorageSavedSteps,
		setLocalStorageSavedSteps,
		clearLocalStorageSavedSteps,
	] = useLocalStorage<FunnelStepData[] | null>(localStorageKey, null);

	const hasStepsChanged = useCallback(() => {
		const normalizedLastSavedSteps = normalizeSteps(
			lastSavedStepsStateRef.current,
		);
		const normalizedDebouncedSteps = normalizeSteps(debouncedSteps);
		return !isEqual(normalizedDebouncedSteps, normalizedLastSavedSteps);
	}, [debouncedSteps]);

	// Handle localStorage for funnel steps
	useEffect(() => {
		// Restore from localStorage on first run if
		if (!hasRestoredFromLocalStorage.current) {
			const savedSteps = localStorageSavedSteps;
			if (savedSteps) {
				handleRestoreSteps(savedSteps);
				hasRestoredFromLocalStorage.current = true;
				return;
			}
		}

		// Save steps to localStorage
		if (hasStepsChanged()) {
			setLocalStorageSavedSteps(debouncedSteps);
		}
	}, [
		debouncedSteps,
		funnel.funnel_id,
		hasStepsChanged,
		handleRestoreSteps,
		localStorageSavedSteps,
		setLocalStorageSavedSteps,
		queryClient,
		selectedTime,
		lastUpdatedSteps,
	]);

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

	// Mutation payload preparation
	const getUpdatePayload = useCallback(
		() => ({
			funnel_id: funnel.funnel_id,
			steps: debouncedSteps,
			timestamp: Date.now(),
		}),
		[funnel.funnel_id, debouncedSteps],
	);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		if (triggerAutoSave && !isEqual(debouncedSteps, lastUpdatedSteps)) {
			setIsUpdatingFunnel(true);
			updateStepsMutation.mutate(getUpdatePayload(), {
				onSuccess: (data) => {
					const updatedFunnelSteps = data?.payload?.steps;

					if (!updatedFunnelSteps) return;

					// Clear localStorage since steps are saved successfully
					clearLocalStorageSavedSteps();

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

					// Only validate if funnel steps definitions
					if (!hasIncompleteStepFields) {
						setLastUpdatedSteps(debouncedSteps);
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
		lastUpdatedSteps,
		queryClient,
		triggerAutoSave,
		showNotifications,
		localStorageSavedSteps,
		clearLocalStorageSavedSteps,
	]);

	return {
		isPopoverOpen,
		setIsPopoverOpen,
		steps,
		isSaving: updateStepsMutation.isLoading,
	};
}
