import { useMemo } from 'react';
import { useGetRuleByID } from 'api/generated/services/rules';
import type { RuletypesActiveMuteInfoDTO } from 'api/generated/services/sigNoz.schemas';

export type ActiveMute = RuletypesActiveMuteInfoDTO;

type UseActiveMuteResult = {
	activeMute: ActiveMute | undefined;
	isLoading: boolean;
	isFetching: boolean;
	refetch: () => void;
};

export const useActiveMute = (
	ruleId: string | undefined,
): UseActiveMuteResult => {
	const { data, isLoading, isFetching, refetch } = useGetRuleByID(
		{ id: ruleId || '' },
		{
			query: {
				enabled: Boolean(ruleId),
				refetchOnWindowFocus: false,
			},
		},
	);

	const activeMute = useMemo(() => data?.data?.activeMute ?? undefined, [data]);

	return {
		activeMute,
		isLoading,
		isFetching,
		refetch: () => {
			void refetch();
		},
	};
};
