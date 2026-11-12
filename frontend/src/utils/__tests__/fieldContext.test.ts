import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { toLegacyLogsFilter } from '../fieldContext';

const item = (type: string): TagFilter['items'][number] => ({
	id: type,
	key: { key: 'k', dataType: DataTypes.String, type },
	op: '=',
	value: 'v',
});

describe('toLegacyLogsFilter', () => {
	it('sends attribute keys as tag and log fields as top-level fields', () => {
		const filter: TagFilter = {
			op: 'AND',
			items: [
				item('attribute'),
				item('resource'),
				item('scope'),
				item('log'),
				item('body'),
				item('tag'),
				item(''),
			],
		};

		expect(
			toLegacyLogsFilter(filter).items.map((filterItem) => filterItem.key?.type),
		).toStrictEqual(['tag', 'resource', 'scope', '', '', 'tag', '']);
	});
});
