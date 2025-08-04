import logEvent from 'api/common/logEvent';
import { ValidateFunnelResponse } from 'api/traceFunnels';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import {
	CustomTimeType,
	Time as TimeV2,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { normalizeSteps } from 'hooks/TracesFunnels/useFunnelConfiguration';
import { useValidateFunnelSteps } from 'hooks/TracesFunnels/useFunnels';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { isEqual } from 'lodash-es';
import {
	createInitialStepsData,
	createSingleStepData,
} from 'pages/TracesFunnelDetails/constants';
import {
	createContext,
	Dispatch,
	SetStateAction,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';
import { useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { FunnelData, FunnelStepData } from 'types/api/traceFunnels';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 } from 'uuid';

interface FunnelContextType {
	startTime: number;
	endTime: number;
	selectedTime: CustomTimeType | Time | TimeV2;
	validTracesCount: number;
	funnelId: string;
	steps: FunnelStepData[];
	setSteps: Dispatch<SetStateAction<FunnelStepData[]>>;
	initialSteps: FunnelStepData[];
	handleAddStep: () => boolean;
	handleStepChange: (index: number, newStep: Partial<FunnelStepData>) => void;
	handleStepRemoval: (index: number) => void;
	handleRunFunnel: () => void;
	handleSaveFunnel: () => void;
	triggerSave: boolean;
	hasUnsavedChanges: boolean;
	validationResponse:
		| SuccessResponse<ValidateFunnelResponse>
		| ErrorResponse
		| undefined;
	isValidateStepsLoading: boolean;
	hasIncompleteStepFields: boolean;
	hasAllEmptyStepFields: boolean;
	handleReplaceStep: (
		index: number,
		serviceName: string,
		spanName: string,
	) => void;
	handleRestoreSteps: (oldSteps: FunnelStepData[]) => void;
	isUpdatingFunnel: boolean;
	setIsUpdatingFunnel: Dispatch<SetStateAction<boolean>>;
	lastUpdatedSteps: FunnelStepData[];
	setLastUpdatedSteps: Dispatch<SetStateAction<FunnelStepData[]>>;
}

const FunnelContext = createContext<FunnelContextType | undefined>(undefined);

export function FunnelProvider({
	children,
	funnelId,
	hasSingleStep = false,
}: {
	children: React.ReactNode;
	funnelId: string;
	hasSingleStep?: boolean;
}): JSX.Element {
	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { start, end } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		interval: selectedTime,
	});

	const startTime = Math.floor(Number(start) * 1e9);
	const endTime = Math.floor(Number(end) * 1e9);

	const queryClient = useQueryClient();
	const data = queryClient.getQueryData<{ payload: FunnelData }>([
		REACT_QUERY_KEY.GET_FUNNEL_DETAILS,
		funnelId,
	]);
	const funnel = data?.payload;

	const defaultSteps = useMemo(
		() => (hasSingleStep ? createSingleStepData() : createInitialStepsData()),
		[hasSingleStep],
	);

	const initialSteps = funnel?.steps?.length ? funnel.steps : defaultSteps;
	const [steps, setSteps] = useState<FunnelStepData[]>(initialSteps);
	const [triggerSave, setTriggerSave] = useState<boolean>(false);
	const [isUpdatingFunnel, setIsUpdatingFunnel] = useState<boolean>(false);
	const [lastUpdatedSteps, setLastUpdatedSteps] = useState<FunnelStepData[]>(
		initialSteps,
	);

	// Check if there are unsaved changes by comparing with initial steps from API
	const hasUnsavedChanges = useMemo(() => {
		const normalizedCurrentSteps = normalizeSteps(steps);
		const normalizedInitialSteps = normalizeSteps(lastUpdatedSteps);
		return !isEqual(normalizedCurrentSteps, normalizedInitialSteps);
	}, [steps, lastUpdatedSteps]);

	const { hasIncompleteStepFields, hasAllEmptyStepFields } = useMemo(
		() => ({
			hasAllEmptyStepFields: steps.every(
				(step) => step.service_name === '' && step.span_name === '',
			),
			hasIncompleteStepFields: steps.some(
				(step) => step.service_name === '' || step.span_name === '',
			),
		}),
		[steps],
	);

	const {
		data: validationResponse,
		isLoading: isValidationLoading,
		isFetching: isValidationFetching,
	} = useValidateFunnelSteps({
		funnelId,
		selectedTime,
		startTime,
		endTime,
		enabled:
			!!funnelId &&
			!!selectedTime &&
			!!startTime &&
			!!endTime &&
			!hasIncompleteStepFields,
		steps,
	});

	const validTracesCount = useMemo(
		() => validationResponse?.payload?.data?.length || 0,
		[validationResponse],
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
		setSteps((prev) => {
			const newStepOrder = prev.length + 1;
			return [
				...prev,
				{
					...createInitialStepsData()[0],
					id: v4(),
					step_order: newStepOrder,
					latency_pointer: newStepOrder === 1 ? 'start' : 'end',
				},
			];
		});
		return true;
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

	const handleRestoreSteps = useCallback((oldSteps: FunnelStepData[]) => {
		setSteps(oldSteps);
	}, []);

	const handleReplaceStep = useCallback(
		(index: number, serviceName: string, spanName: string) => {
			handleStepUpdate(index, {
				service_name: serviceName,
				span_name: spanName,
				filters: {
					items: [],
					op: 'AND',
				},
			});
			logEvent('Trace Funnels: span added (replaced) from trace details page', {});
		},
		[handleStepUpdate],
	);
	if (!funnelId) {
		throw new Error('Funnel ID is required');
	}

	const handleRunFunnel = useCallback(async (): Promise<void> => {
		if (validTracesCount === 0) return;

		queryClient.refetchQueries([
			REACT_QUERY_KEY.GET_FUNNEL_OVERVIEW,
			funnelId,
			selectedTime,
		]);
		queryClient.refetchQueries([
			REACT_QUERY_KEY.GET_FUNNEL_STEPS_OVERVIEW,
			funnelId,
			selectedTime,
		]);
		queryClient.refetchQueries([
			REACT_QUERY_KEY.GET_FUNNEL_STEPS_GRAPH_DATA,
			funnelId,
			selectedTime,
		]);
		queryClient.refetchQueries([
			REACT_QUERY_KEY.GET_FUNNEL_ERROR_TRACES,
			funnelId,
			selectedTime,
		]);
		queryClient.refetchQueries([
			REACT_QUERY_KEY.GET_FUNNEL_SLOW_TRACES,
			funnelId,
			selectedTime,
		]);
	}, [funnelId, queryClient, selectedTime, validTracesCount]);

	const handleSaveFunnel = useCallback(() => {
		setTriggerSave(true);
		// Reset the trigger after a brief moment to allow useFunnelConfiguration to pick it up
		setTimeout(() => setTriggerSave(false), 100);
	}, []);

	const value = useMemo<FunnelContextType>(
		() => ({
			funnelId,
			startTime,
			endTime,
			validTracesCount,
			selectedTime,
			steps,
			setSteps,
			initialSteps,
			handleStepChange: handleStepUpdate,
			handleAddStep: addNewStep,
			handleStepRemoval,
			handleRunFunnel,
			handleSaveFunnel,
			triggerSave,
			validationResponse,
			isValidateStepsLoading: isValidationLoading || isValidationFetching,
			hasIncompleteStepFields,
			hasAllEmptyStepFields,
			handleReplaceStep,
			handleRestoreSteps,
			hasUnsavedChanges,
			setIsUpdatingFunnel,
			isUpdatingFunnel,
			lastUpdatedSteps,
			setLastUpdatedSteps,
		}),
		[
			funnelId,
			startTime,
			endTime,
			validTracesCount,
			selectedTime,
			steps,
			initialSteps,
			handleStepUpdate,
			addNewStep,
			handleStepRemoval,
			handleRunFunnel,
			handleSaveFunnel,
			triggerSave,
			validationResponse,
			isValidationLoading,
			isValidationFetching,
			hasIncompleteStepFields,
			hasAllEmptyStepFields,
			handleReplaceStep,
			handleRestoreSteps,
			hasUnsavedChanges,
			setIsUpdatingFunnel,
			isUpdatingFunnel,
			lastUpdatedSteps,
			setLastUpdatedSteps,
		],
	);

	return (
		<FunnelContext.Provider value={value}>{children}</FunnelContext.Provider>
	);
}

FunnelProvider.defaultProps = {
	hasSingleStep: false,
};

export function useFunnelContext(): FunnelContextType {
	const context = useContext(FunnelContext);
	if (context === undefined) {
		throw new Error('useFunnelContext must be used within a FunnelProvider');
	}
	return context;
}
