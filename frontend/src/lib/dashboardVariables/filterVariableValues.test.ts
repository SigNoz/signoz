import { filterVariableValues } from './filterVariableValues';

describe('filterVariableValues', () => {
	it('returns values unchanged when pattern is empty', () => {
		expect(
			filterVariableValues(['frontend', 'backend'], '').values,
		).toStrictEqual(['frontend', 'backend']);
	});

	it('filters values by regex pattern', () => {
		expect(
			filterVariableValues(['frontend-api', 'backend-api', 'worker'], '^front')
				.values,
		).toStrictEqual(['frontend-api']);
	});

	it('uses the first capture group as the returned value', () => {
		expect(
			filterVariableValues(
				['k8s-prod-api-123', 'k8s-prod-worker-456', 'dev-api'],
				'^k8s-prod-(.+)-\\d+$',
			).values,
		).toStrictEqual(['api', 'worker']);
	});

	it('supports slash-delimited regex with flags', () => {
		expect(filterVariableValues(['API', 'web'], '/api/i').values).toStrictEqual([
			'API',
		]);
	});

	it('deduplicates captured values', () => {
		expect(
			filterVariableValues(
				['pod-api-1', 'pod-api-2', 'pod-worker-1'],
				'^pod-(.+)-\\d+$',
			).values,
		).toStrictEqual(['api', 'worker']);
	});

	it('returns the original values with an error for invalid regex', () => {
		const result = filterVariableValues(['frontend'], '[');

		expect(result.values).toStrictEqual(['frontend']);
		expect(result.error).toBeTruthy();
	});
});
