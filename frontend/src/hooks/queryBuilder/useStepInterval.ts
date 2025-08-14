import { Widgets } from 'types/api/dashboard/getAll';

export const updateStepInterval = (
	query: Widgets['query'],
): Widgets['query'] => ({
	...query,
	builder: {
		...query?.builder,
		queryData:
			query?.builder?.queryData?.map((item) => ({
				...item,
				stepInterval: item?.stepInterval ?? null,
			})) || [],
	},
});
