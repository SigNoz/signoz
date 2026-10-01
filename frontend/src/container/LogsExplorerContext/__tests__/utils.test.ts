import { ILog } from 'types/api/logs/log';

import {
	getFiltersFromResources,
	isServiceOrEnvironmentAttribute,
} from '../utils';

const filtersOf = (resources: Record<string, string>): unknown[][] =>
	getFiltersFromResources(resources as ILog['resources_string']).map((item) => [
		item.key?.key,
		item.value,
	]);

describe('getFiltersFromResources', () => {
	it('keeps the old name of a log that has only the old name', () => {
		expect(
			filtersOf({
				'service.name': 'cart',
				'deployment.environment': 'production',
			}),
		).toStrictEqual([
			['service.name', 'cart'],
			['deployment.environment', 'production'],
		]);
	});

	it('keeps the current name of a log that has only the current name', () => {
		expect(
			filtersOf({ 'deployment.environment.name': 'production' }),
		).toStrictEqual([['deployment.environment.name', 'production']]);
	});

	it('keeps only the current name of a log that has both names', () => {
		expect(
			filtersOf({
				'deployment.environment': 'production',
				'deployment.environment.name': 'staging',
			}),
		).toStrictEqual([['deployment.environment.name', 'staging']]);
	});
});

describe('isServiceOrEnvironmentAttribute', () => {
	it.each(['deployment.environment.name', 'deployment.environment'])(
		'always includes %s',
		(key) => {
			expect(isServiceOrEnvironmentAttribute(key)).toBe(true);
		},
	);
});
