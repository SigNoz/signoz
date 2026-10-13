import type { Querybuildertypesv5QueryEnvelopeDTO } from 'api/generated/services/sigNoz.schemas';

import {
	isAIBuilderEnvelope,
	isBuilderEnvelope,
	isBuilderPluginKind,
} from '../builderEnvelope';

const envelope = (type: string): Querybuildertypesv5QueryEnvelopeDTO =>
	({ type, spec: {} }) as unknown as Querybuildertypesv5QueryEnvelopeDTO;

describe('builder envelope predicates', () => {
	describe('isBuilderEnvelope', () => {
		it.each(['builder_query', 'builder_ai_query'])('accepts %s', (type) => {
			expect(isBuilderEnvelope(envelope(type))).toBe(true);
		});

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

		it('rejects builder_query', () => {
			expect(isAIBuilderEnvelope(envelope('builder_query'))).toBe(false);
		});
	});

	describe('isBuilderPluginKind', () => {
		it.each(['signoz/BuilderQuery', 'signoz/AIBuilderQuery'])(
			'accepts %s',
			(kind) => {
				expect(isBuilderPluginKind(kind)).toBe(true);
			},
		);

		it.each(['signoz/CompositeQuery', 'signoz/PromQLQuery'])(
			'rejects %s',
			(kind) => {
				expect(isBuilderPluginKind(kind)).toBe(false);
			},
		);
	});
});
