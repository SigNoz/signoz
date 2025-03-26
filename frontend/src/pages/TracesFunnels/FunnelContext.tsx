import { Time } from 'container/TopNav/DateTimeSelection/config';
import {
	CustomTimeType,
	Time as TimeV2,
} from 'container/TopNav/DateTimeSelectionV2/config';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { createContext, useContext, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

interface FunnelContextType {
	startTime: number;
	endTime: number;
	selectedTime: CustomTimeType | Time | TimeV2;
	validTracesCount: number;
	setValidTracesCount: (count: number) => void;
	funnelId: string;
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
		}),
		[funnelId, startTime, endTime, validTracesCount, selectedTime],
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
