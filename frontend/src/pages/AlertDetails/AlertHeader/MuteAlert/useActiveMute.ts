import { useMemo } from 'react';
import {
	getListDowntimeSchedulesQueryKey,
	useListDowntimeSchedules,
} from 'api/generated/services/downtimeschedules';
import type { AlertmanagertypesPlannedMaintenanceDTO } from 'api/generated/services/sigNoz.schemas';
import { AlertmanagertypesMaintenanceStatusDTO } from 'api/generated/services/sigNoz.schemas';
import dayjs from 'dayjs';

export type ActiveMute = AlertmanagertypesPlannedMaintenanceDTO & {
	effectiveStartTime?: string;
	effectiveEndTime?: string;
};

type UseActiveMuteResult = {
	activeMute: ActiveMute | undefined;
	isLoading: boolean;
	isFetching: boolean;
	refetch: () => void;
};

const isMuteActiveNow = (
	schedule: AlertmanagertypesPlannedMaintenanceDTO,
): {
	active: boolean;
	effectiveStartTime?: string;
	effectiveEndTime?: string;
} => {
	if (schedule.status !== AlertmanagertypesMaintenanceStatusDTO.active) {
		return { active: false };
	}
	const now = dayjs();
	const start =
		schedule.schedule?.recurrence?.startTime || schedule.schedule?.startTime;
	const end =
		schedule.schedule?.recurrence?.endTime || schedule.schedule?.endTime;

	if (start && now.isBefore(dayjs(start))) {
		return { active: false };
	}
	if (end && now.isAfter(dayjs(end))) {
		return { active: false };
	}
	return {
		active: true,
		effectiveStartTime: start || undefined,
		effectiveEndTime: end || undefined,
	};
};

export const findActiveMuteForRule = (
	schedules: AlertmanagertypesPlannedMaintenanceDTO[] | undefined,
	ruleId: string,
): ActiveMute | undefined => {
	if (!schedules || !ruleId) {
		return undefined;
	}

	const candidates = schedules
		.filter((s) => s.alertIds?.includes(ruleId))
		.map((s) => ({ schedule: s, ...isMuteActiveNow(s) }))
		.filter((c) => c.active);

	if (candidates.length === 0) {
		return undefined;
	}

	// Prefer the one ending soonest (most specific window) and falling back to the first.
	const sorted = [...candidates].sort((a, b) => {
		const aEnd = a.effectiveEndTime
			? dayjs(a.effectiveEndTime).valueOf()
			: Infinity;
		const bEnd = b.effectiveEndTime
			? dayjs(b.effectiveEndTime).valueOf()
			: Infinity;
		return aEnd - bEnd;
	});

	const winner = sorted[0];
	return {
		...winner.schedule,
		effectiveStartTime: winner.effectiveStartTime,
		effectiveEndTime: winner.effectiveEndTime,
	};
};

export const useActiveMute = (
	ruleId: string | undefined,
): UseActiveMuteResult => {
	const { data, isLoading, isFetching, refetch } = useListDowntimeSchedules(
		undefined,
		{
			query: {
				enabled: Boolean(ruleId),
				refetchOnWindowFocus: false,
			},
		},
	);

	const activeMute = useMemo(
		() => findActiveMuteForRule(data?.data, ruleId || ''),
		[data, ruleId],
	);

	return {
		activeMute,
		isLoading,
		isFetching,
		refetch: () => {
			void refetch();
		},
	};
};

export const activeMuteQueryKey = getListDowntimeSchedulesQueryKey();
