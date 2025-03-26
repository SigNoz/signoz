import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import {
	CustomTimeType,
	Time as TimeV2,
} from 'container/TopNav/DateTimeSelectionV2/config';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { initialStepsData } from 'pages/TracesFunnelDetails/constants';
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
import { FunnelData, FunnelStepData } from 'types/api/traceFunnels';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 } from 'uuid';

interface FunnelContextType {
	startTime: number;
	endTime: number;
	selectedTime: CustomTimeType | Time | TimeV2;
	validTracesCount: number;
	setValidTracesCount: (count: number) => void;
	funnelId: string;
	steps: FunnelStepData[];
	setSteps: Dispatch<SetStateAction<FunnelStepData[]>>;
	initialSteps: FunnelStepData[];
	handleAddStep: () => void;
	handleStepChange: (index: number, newStep: Partial<FunnelStepData>) => void;
	handleStepRemoval: (index: number) => void;
}

const FunnelContext = createContext<FunnelContextType | undefined>(undefined);

export function FunnelProvider({
	children,
	funnelId,
}: {
	children: React.ReactNode;
	funnelId: string;
}): JSX.Element {
	const [validTracesCount, setValidTracesCount] = useState(0);
	const queryClient = useQueryClient();
	const data = queryClient.getQueryData<{ payload: FunnelData }>([
		REACT_QUERY_KEY.GET_FUNNEL_DETAILS,
		funnelId,
	]);
	const funnel = data?.payload;
	const initialSteps = funnel?.steps?.length ? funnel.steps : initialStepsData;
	const [steps, setSteps] = useState<FunnelStepData[]>(initialSteps);

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

	if (!funnelId) {
		throw new Error('Funnel ID is required');
	}

	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { start: startTime, end: endTime } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		interval: selectedTime,
	});

	const value = useMemo<FunnelContextType>(
		() => ({
			funnelId,
			startTime: Math.floor(Number(startTime) * 1e9),
			endTime: Math.floor(Number(endTime) * 1e9),
			validTracesCount,
			selectedTime,
			setValidTracesCount,
			steps,
			setSteps,
			initialSteps,
			handleStepChange: handleStepUpdate,
			handleAddStep: addNewStep,
			handleStepRemoval,
		}),
		[
			addNewStep,
			endTime,
			funnelId,
			handleStepRemoval,
			handleStepUpdate,
			initialSteps,
			selectedTime,
			startTime,
			steps,
			validTracesCount,
		],
	);

	return (
		<FunnelContext.Provider value={value}>{children}</FunnelContext.Provider>
	);
}

export function useFunnelContext(): FunnelContextType {
	const context = useContext(FunnelContext);
	if (context === undefined) {
		throw new Error('useFunnelContext must be used within a FunnelProvider');
	}
	return context;
}
