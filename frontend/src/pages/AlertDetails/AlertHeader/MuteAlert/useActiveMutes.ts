import { useMemo } from 'react';
import { useGetRuleByID } from 'api/generated/services/rules';
import type { RuletypesActiveMuteDTO } from 'api/generated/services/sigNoz.schemas';

export type ActiveMute = RuletypesActiveMuteDTO;

type UseActiveMuteResult = {
	activeMutes: ActiveMute[];
	isLoading: boolean;
	isFetching: boolean;
	refetch: () => void;
};

export const useActiveMutes = (
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

	const activeMutes = useMemo(() => data?.data?.mutes ?? [], [data]);

	return { activeMutes, isLoading, isFetching, refetch };
};
