import { ValidateFunnelResponse } from 'api/traceFunnels';
import useDebounce from 'hooks/useDebounce';
import { useNotifications } from 'hooks/useNotifications';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { initialStepsData } from 'pages/TracesFunnelDetails/constants';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { FunnelData, FunnelStepData } from 'types/api/traceFunnels';
import { GlobalReducer } from 'types/reducer/globalTime';
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

// Time conversion helper for consistent nanoseconds handling
const convertToNanoseconds = (time: string): number => parseInt(time, 10) * 1e9;

export default function useFunnelConfiguration({
	funnel,
	setValidTracesCount,
}: {
	funnel: FunnelData;
	setValidTracesCount: (count: number) => void;
}): UseFunnelConfiguration {
	const { notifications } = useNotifications();
	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

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
	const validateStepsMutation = useValidateFunnelSteps(funnel.id);

	// Derived state
	const hasStepsChanged = useCallback(
		() => JSON.stringify(debouncedSteps) !== JSON.stringify(initialSteps),
		[debouncedSteps, initialSteps],
	);

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

	// Time range calculation
	const getValidationTimeRange = useCallback(() => {
		const { start, end } = getStartEndRangeTime({
			type: 'GLOBAL_TIME',
			interval: selectedTime,
		});

		return {
			start_time: convertToNanoseconds(start),
			end_time: convertToNanoseconds(end),
		};
	}, [selectedTime]);

	// Steps validation handlers
	const handleValidationResult = useCallback(
		(response: SuccessResponse<ValidateFunnelResponse> | ErrorResponse) => {
			const traces = response?.payload?.data || [];
			setValidTracesCount(traces.length);
		},
		[setValidTracesCount],
	);

	const validateCurrentSteps = useCallback(() => {
		validateStepsMutation.mutate(getValidationTimeRange(), {
			onSuccess: (response) => handleValidationResult(response),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [getValidationTimeRange, handleValidationResult]);

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
		validateCurrentSteps();
	}, [validateCurrentSteps, selectedTime]);

	useEffect(() => {
		if (hasStepsChanged()) {
			updateStepsMutation.mutate(getUpdatePayload(), {
				onSuccess: () => {
					// Only validate if service_name or span_name changed
					if (hasStepServiceOrSpanNameChanged(lastValidatedSteps, debouncedSteps)) {
						validateCurrentSteps();
						setLastValidatedSteps(debouncedSteps);
					}
				},
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedSteps, hasStepsChanged, getUpdatePayload, validateCurrentSteps]);

	return {
		isPopoverOpen,
		setIsPopoverOpen,
		steps,
		handleAddStep: addNewStep,
		handleStepChange: handleStepUpdate,
		handleStepRemoval,
		isValidateStepsMutationLoading: validateStepsMutation.isLoading,
	};
}
