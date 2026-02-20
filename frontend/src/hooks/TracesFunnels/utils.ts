import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { FunnelStepData } from 'types/api/traceFunnels';

export const normalizeSteps = (steps: FunnelStepData[]): FunnelStepData[] => {
	if (steps.some((step) => !step.filters)) {
		return steps;
	}

	return steps.map((step) => ({
		...step,
		filters: {
			...step.filters,
			items: step.filters.items.map((item) => {
				const {
					id: _unusedId,
					isIndexed: _isIndexed,
					...keyObj
				} = item.key as BaseAutocompleteData;
				return {
					id: '',
					key: keyObj,
					value: item.value,
					op: item.op,
				};
			}),
		},
	}));
};
