import type { Querybuildertypesv5QueryEnvelopeDTO } from 'api/generated/services/sigNoz.schemas';

import {
	isAIBuilderEnvelope,
	isBuilderOrAIEnvelope,
	isBuilderOrAIPluginKind,
} from '../builderEnvelope';

const envelope = (type: string): Querybuildertypesv5QueryEnvelopeDTO =>
	({ type, spec: {} }) as unknown as Querybuildertypesv5QueryEnvelopeDTO;

describe('builder envelope predicates', () => {
	describe('isBuilderOrAIEnvelope', () => {
		it.each(['builder_query', 'builder_ai_query'])('accepts %s', (type) => {
			expect(isBuilderOrAIEnvelope(envelope(type))).toBe(true);
		});

		it.each([
			'builder_formula',
			'builder_trace_operator',
			'promql',
			'clickhouse_sql',
		])('rejects %s', (type) => {
			expect(isBuilderOrAIEnvelope(envelope(type))).toBe(false);
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

	describe('isBuilderOrAIPluginKind', () => {
		it.each(['signoz/BuilderQuery', 'signoz/AIBuilderQuery'])(
			'accepts %s',
			(kind) => {
				expect(isBuilderOrAIPluginKind(kind)).toBe(true);
			},
		);

		it.each(['signoz/CompositeQuery', 'signoz/PromQLQuery'])(
			'rejects %s',
			(kind) => {
				expect(isBuilderOrAIPluginKind(kind)).toBe(false);
			},
		);
	});
});
