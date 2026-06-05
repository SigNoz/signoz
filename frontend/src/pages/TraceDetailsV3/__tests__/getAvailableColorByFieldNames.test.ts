import { SpanV3 } from 'types/api/trace/getTraceV3';

import { getAvailableColorByFieldNames } from '../utils';

const span = (partial: Partial<SpanV3>): SpanV3 =>
	({ level: 1, resource: {}, attributes: {}, ...partial }) as SpanV3;

describe('getAvailableColorByFieldNames', () => {
	it('returns [] for an empty span set', () => {
		expect(getAvailableColorByFieldNames([])).toStrictEqual([]);
	});

	it('offers a field if any span carries it, in option order', () => {
		const spans = [
			span({ resource: { 'service.name': 'api' } }),
			// k8s.node.name lives on a non-root span — still offered
			span({ resource: { 'k8s.node.name': 'node-1' } }),
		];
		expect(getAvailableColorByFieldNames(spans)).toStrictEqual([
			'service.name',
			'k8s.node.name',
		]);
	});

	it('reads from attributes when the key is not on resource', () => {
		const spans = [span({ attributes: { 'host.name': 'box-1' } })];
		expect(getAvailableColorByFieldNames(spans)).toStrictEqual(['host.name']);
	});

	it('does not offer fields no span carries', () => {
		const spans = [span({ resource: { 'service.name': 'api' } })];
		expect(getAvailableColorByFieldNames(spans)).toStrictEqual(['service.name']);
	});
});
