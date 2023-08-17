import { OPERATORS } from 'constants/queryBuilder';
import { ILog } from 'types/api/logs/log';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

export const getFiltersFromResources = (
	resources: ILog['resources_string'],
): TagFilterItem[] =>
	Object.keys(resources).map((key: string) => {
		const resourceValue = resources[key] as string;
		return {
			id: uuid(),
			key: {
				key,
				dataType: 'string',
				type: 'resource',
				isColumn: false,
			},
			op: OPERATORS['='],
			value: resourceValue,
		};
	});
