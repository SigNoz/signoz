import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { buildDefaultLegendFromGroupBy } from '../utils';

const groupBy = (...keys: string[]): IBuilderQuery['groupBy'] =>
	keys.map((key) => ({
		key,
		type: '',
		dataType: '',
		id: `${key}----`,
	})) as IBuilderQuery['groupBy'];

describe('buildDefaultLegendFromGroupBy', () => {
	it('returns null for no group-by', () => {
		expect(buildDefaultLegendFromGroupBy([])).toBeNull();
	});

	it('templates each key by name', () => {
		expect(
			buildDefaultLegendFromGroupBy(groupBy('service.name', 'host.name')),
		).toBe('service.name = {{service.name}}, host.name = {{host.name}}');
	});

	it('drops a context prefix inside the template but keeps it in the label', () => {
		expect(buildDefaultLegendFromGroupBy(groupBy('resource.service.name'))).toBe(
			'resource.service.name = {{service.name}}',
		);
	});
});
