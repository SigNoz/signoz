import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { toLegacyTagFilter } from '../fieldContext';

const item = (type: string): TagFilter['items'][number] => ({
	id: type,
	key: { key: 'k', dataType: DataTypes.String, type },
	op: '=',
	value: 'v',
});

describe('toLegacyTagFilter', () => {
	it('sends attribute keys as tag and leaves every other type as is', () => {
		const filter: TagFilter = {
			op: 'AND',
			items: [
				item('attribute'),
				item('resource'),
				item('tag'),
				item(''),
				item('spanSearchScope'),
			],
		};

		expect(toLegacyTagFilter(filter).items.map((i) => i.key?.type)).toStrictEqual(
			['tag', 'resource', 'tag', '', 'spanSearchScope'],
		);
	});
});
