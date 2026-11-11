import { useMemo } from 'react';
import { useListRulesV3 } from 'api/generated/services/rules';
import {
	type ListRulesV3200,
	type ListRulesV3Params,
	RuletypesAlertStateDTO,
	type RuletypesListableRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { GeneratedAPIInstance } from 'api/generatedAPIInstance';

const HOME_ALERT_RULES_LIMIT = 5;

const FIRING_RULES_PARAMS: ListRulesV3Params = {
	states: [RuletypesAlertStateDTO.firing],
	limit: HOME_ALERT_RULES_LIMIT,
};

interface HomeAlertRules {
	rules: RuletypesListableRuleDTO[];
	isLoading: boolean;
	isError: boolean;
}

export function useHomeAlertRules(): HomeAlertRules {
	const firing = useListRulesV3(FIRING_RULES_PARAMS, {
		query: {
			cacheTime: 0,
			// The backend binds repeated `states=` keys; axios' default sends `states[]=`.
			queryFn: ({ signal }) =>
				GeneratedAPIInstance<ListRulesV3200>({
					url: '/api/v3/rules',
					method: 'GET',
					params: FIRING_RULES_PARAMS,
					paramsSerializer: { indexes: null },
					signal,
				}),
		},
	});
	const firingRules = firing.data?.data.rules;
	const latest = useListRulesV3(
		{ limit: HOME_ALERT_RULES_LIMIT },
		{
			query: {
				cacheTime: 0,
				enabled:
					firingRules !== undefined && firingRules.length < HOME_ALERT_RULES_LIMIT,
			},
		},
	);

	const rules = useMemo(() => {
		const firingIds = new Set(firingRules?.map(({ id }) => id));
		const others = (latest.data?.data.rules ?? []).filter(
			({ id }) => !firingIds.has(id),
		);
		return [...(firingRules ?? []), ...others].slice(0, HOME_ALERT_RULES_LIMIT);
	}, [firingRules, latest.data]);

	return {
		rules,
		isLoading: firing.isLoading || latest.isLoading,
		isError: firing.isError || latest.isError,
	};
}
