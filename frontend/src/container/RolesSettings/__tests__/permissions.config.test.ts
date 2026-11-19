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

	it('offers only the PRD verbs for ingestion-key', () => {
		expect([...getResourceVerbs('ingestion-key')].sort()).toStrictEqual([
			'attach',
			'create',
			'delete',
			'detach',
			'list',
			'update',
		]);
	});

	it('offers only the PRD verbs for ingestion-limit', () => {
		expect([...getResourceVerbs('ingestion-limit')].sort()).toStrictEqual([
			'create',
			'delete',
			'update',
		]);
	});
});
