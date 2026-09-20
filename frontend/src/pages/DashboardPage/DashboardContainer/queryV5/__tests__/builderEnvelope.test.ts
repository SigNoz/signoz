import type { Querybuildertypesv5QueryEnvelopeDTO } from 'api/generated/services/sigNoz.schemas';

import { isAIBuilderEnvelope, isBuilderEnvelope } from '../builderEnvelope';

// Only `type` is read; the generated envelope union erases spec to unknown anyway.
const envelope = (type: string): Querybuildertypesv5QueryEnvelopeDTO =>
	({ type, spec: {} }) as unknown as Querybuildertypesv5QueryEnvelopeDTO;

describe('builder envelope predicates', () => {
	describe('isBuilderEnvelope', () => {
		it.each(['builder_query', 'builder_ai_query'])(
			'accepts %s — both carry a builder query spec',
			(type) => {
				expect(isBuilderEnvelope(envelope(type))).toBe(true);
			},
		);

		// Formula and TraceOperator carry no signal and reference other queries by name.
		it.each([
			'builder_formula',
			'builder_trace_operator',
			'promql',
			'clickhouse_sql',
		])('rejects %s', (type) => {
			expect(isBuilderEnvelope(envelope(type))).toBe(false);
		});
	});

	describe('isAIBuilderEnvelope', () => {
		it('accepts builder_ai_query', () => {
			expect(isAIBuilderEnvelope(envelope('builder_ai_query'))).toBe(true);
		});

		it('rejects builder_query, which is the whole point of the narrower check', () => {
			expect(isAIBuilderEnvelope(envelope('builder_query'))).toBe(false);
		});
	});
});
