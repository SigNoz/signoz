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
}: {
	funnel: FunnelData;
}): UseFunnelConfiguration {
	const { notifications } = useNotifications();
	const {
		steps,
		initialSteps,
		setHasIncompleteStepFields,
		setHasAllEmptyStepFields,
	} = useFunnelContext();

	// State management
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);

	const debouncedSteps = useDebounce(steps, 200);

	const [lastValidatedSteps, setLastValidatedSteps] = useState<FunnelStepData[]>(
		initialSteps,
	);

	// Mutation hooks
	const updateStepsMutation = useUpdateFunnelSteps(funnel.id, notifications);

	// Derived state
	const lastSavedStepsStateRef = useRef<FunnelStepData[]>(steps);

	const hasStepsChanged = useCallback(() => {
		const normalizedLastSavedSteps = normalizeSteps(
			lastSavedStepsStateRef.current,
		);
		const normalizedDebouncedSteps = normalizeSteps(debouncedSteps);
		return !isEqual(normalizedDebouncedSteps, normalizedLastSavedSteps);
	}, [debouncedSteps]);

	const hasStepServiceOrSpanNameChanged = useCallback(
		(prevSteps: FunnelStepData[], nextSteps: FunnelStepData[]): boolean => {
			if (prevSteps.length !== nextSteps.length) return true;
			return prevSteps.some((step, index) => {
				const nextStep = nextSteps[index];
				return (
					step.service_name !== nextStep.service_name ||
					step.span_name !== nextStep.span_name
				);
			});
		},
		[],
	);

	// Mutation payload preparation
	const getUpdatePayload = useCallback(
		() => ({
			funnel_id: funnel.id,
			steps: debouncedSteps,
			updated_timestamp: Date.now(),
		}),
		[funnel.id, debouncedSteps],
	);

	const queryClient = useQueryClient();
	const { selectedTime } = useFunnelContext();

	const validateStepsQueryKey = useMemo(
		() => [REACT_QUERY_KEY.VALIDATE_FUNNEL_STEPS, funnel.id, selectedTime],
		[funnel.id, selectedTime],
	);
	useEffect(() => {
		if (hasStepsChanged()) {
			updateStepsMutation.mutate(getUpdatePayload(), {
				onSuccess: (data) => {
					const updatedFunnelSteps = data?.payload?.steps;

					if (!updatedFunnelSteps) return;

					lastSavedStepsStateRef.current = updatedFunnelSteps;

					const hasIncompleteStepFields = updatedFunnelSteps.some(
						(step) => step.service_name === '' || step.span_name === '',
					);

					const hasAllEmptyStepsData = updatedFunnelSteps.every(
						(step) => step.service_name === '' && step.span_name === '',
					);

					setHasIncompleteStepFields(hasIncompleteStepFields);
					setHasAllEmptyStepFields(hasAllEmptyStepsData);

					// Only validate if service_name or span_name changed
					if (
						!hasIncompleteStepFields &&
						hasStepServiceOrSpanNameChanged(lastValidatedSteps, debouncedSteps)
					) {
						queryClient.refetchQueries(validateStepsQueryKey);
						setLastValidatedSteps(debouncedSteps);
					}
				},
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		debouncedSteps,
		getUpdatePayload,
		hasStepServiceOrSpanNameChanged,
		hasStepsChanged,
		lastValidatedSteps,
		queryClient,
		validateStepsQueryKey,
	]);

	return {
		isPopoverOpen,
		setIsPopoverOpen,
		steps,
	};
}
