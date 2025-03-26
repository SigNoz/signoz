import { ValidateFunnelResponse } from 'api/traceFunnels';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import useDebounce from 'hooks/useDebounce';
import { useNotifications } from 'hooks/useNotifications';
import { isEqual } from 'lodash-es';
import { initialStepsData } from 'pages/TracesFunnelDetails/constants';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { FunnelData, FunnelStepData } from 'types/api/traceFunnels';
import { v4 } from 'uuid';

import { useUpdateFunnelSteps, useValidateFunnelSteps } from './useFunnels';

interface UseFunnelConfiguration {
	isPopoverOpen: boolean;
	setIsPopoverOpen: (isPopoverOpen: boolean) => void;
	steps: FunnelStepData[];
	handleAddStep: () => void;
	handleStepChange: (index: number, newStep: Partial<FunnelStepData>) => void;
	handleStepRemoval: (index: number) => void;
	isValidateStepsMutationLoading: boolean;
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
	const { setValidTracesCount } = useFunnelContext();

	// State management
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);

	const initialSteps = funnel.steps?.length ? funnel.steps : initialStepsData;
	const [steps, setSteps] = useState<FunnelStepData[]>(initialSteps);
	const debouncedSteps = useDebounce(steps, 200);

	const [lastValidatedSteps, setLastValidatedSteps] = useState<FunnelStepData[]>(
		initialSteps,
	);

	// Mutation hooks
	const updateStepsMutation = useUpdateFunnelSteps(funnel.id, notifications);
	const {
		data: validationResponse,
		isLoading: isValidationLoading,
	} = useValidateFunnelSteps();

	// Derived state
	const lastSavedStateRef = useRef<FunnelStepData[]>(steps);

	const hasStepsChanged = useCallback(() => {
		const normalizedLastSavedSteps = normalizeSteps(lastSavedStateRef.current);
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

	// Steps validation handlers
	const handleValidationResult = useCallback(
		(response: SuccessResponse<ValidateFunnelResponse> | ErrorResponse) => {
			const traces = response?.payload?.data || [];
			setValidTracesCount(traces.length);
		},
		[setValidTracesCount],
	);

	// Step modifications
	const handleStepUpdate = useCallback(
		(index: number, newStep: Partial<FunnelStepData>) => {
			setSteps((prev) =>
				prev.map((step, i) => (i === index ? { ...step, ...newStep } : step)),
			);
		},
		[],
	);

	const addNewStep = useCallback(() => {
		setSteps((prev) => [
			...prev,
			{
				...initialStepsData[0],
				id: v4(),
				step_order: prev.length + 1,
			},
		]);
	}, []);

	const handleStepRemoval = useCallback((index: number) => {
		setSteps((prev) =>
			prev
				// remove the step in the index
				.filter((_, i) => i !== index)
				// reset the step_order for the remaining steps
				.map((step, newIndex) => ({
					...step,
					step_order: newIndex + 1,
				})),
		);
	}, []);

	// Side Effects
	useEffect(() => {
		if (validationResponse) {
			handleValidationResult(validationResponse);
		}
	}, [validationResponse, handleValidationResult]);

	const queryClient = useQueryClient();
	const { selectedTime } = useFunnelContext();
	useEffect(() => {
		if (hasStepsChanged()) {
			updateStepsMutation.mutate(getUpdatePayload(), {
				onSuccess: (data) => {
					if (data?.payload?.steps) lastSavedStateRef.current = debouncedSteps;

					// Only validate if service_name or span_name changed
					if (hasStepServiceOrSpanNameChanged(lastValidatedSteps, debouncedSteps)) {
						queryClient.refetchQueries([
							REACT_QUERY_KEY.VALIDATE_FUNNEL_STEPS,
							funnel.id,
							selectedTime,
						]);
						setLastValidatedSteps(debouncedSteps);
					}
				},
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedSteps, steps]);

	return {
		isPopoverOpen,
		setIsPopoverOpen,
		steps,
		handleAddStep: addNewStep,
		handleStepChange: handleStepUpdate,
		handleStepRemoval,
		isValidateStepsMutationLoading: isValidationLoading || false,
	};
}
