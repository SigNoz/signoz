import {
	getResourcePanel,
	getResourceVerbs,
	RESOURCE_ORDER,
} from '../permissions.config';

describe('ingestion permissions in the roles editor', () => {
	it('lists both entities', () => {
		expect(RESOURCE_ORDER).toContain('ingestion-key');
		expect(RESOURCE_ORDER).toContain('ingestion-limit');
		expect(getResourcePanel('ingestion-key').label).toBe('Ingestion Keys');
		expect(getResourcePanel('ingestion-limit').label).toBe('Ingestion Limits');
	});

	it('offers every metaresource verb for ingestion-key', () => {
		expect([...getResourceVerbs('ingestion-key')].sort()).toStrictEqual([
			'attach',
			'create',
			'delete',
			'detach',
			'list',
			'read',
			'update',
		]);
	});

	it('offers no attach or detach for ingestion-limit', () => {
		expect([...getResourceVerbs('ingestion-limit')].sort()).toStrictEqual([
			'create',
			'delete',
			'list',
			'read',
			'update',
		]);
	});
});
