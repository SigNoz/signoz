import { QueryParams } from 'constants/query';

import { normalizeMatchType, normalizeOperator } from './conditionNormalizers';
import {
	AlertThresholdMatchType,
	AlertThresholdOperator,
	Threshold,
} from './types';

export enum EvaluationWindowPreset {
	METER = 'meter',
}

export interface ResolvedAlertPrefill {
	thresholds?: Threshold[];
	matchType?: AlertThresholdMatchType;
	operator?: AlertThresholdOperator;
	evaluationWindowPreset?: EvaluationWindowPreset;
}

function parseThresholds(raw: string | null): Threshold[] | undefined {
	if (!raw) {
		return undefined;
	}
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as Threshold[]) : undefined;
	} catch (error) {
		console.error('Error parsing thresholds from URL:', error);
		return undefined;
	}
}

function parseEvaluationWindowPreset(
	raw: string | null,
): EvaluationWindowPreset | undefined {
	return raw === EvaluationWindowPreset.METER
		? EvaluationWindowPreset.METER
		: undefined;
}

/** URL → declarative prefill plan; the consumer applies it without knowing the producer. */
export function resolveUrlAlertPrefill(
	params: URLSearchParams,
): ResolvedAlertPrefill {
	return {
		thresholds: parseThresholds(params.get(QueryParams.thresholds)),
		matchType: normalizeMatchType(params.get(QueryParams.matchType) ?? undefined),
		operator: normalizeOperator(params.get(QueryParams.compareOp) ?? undefined),
		evaluationWindowPreset: parseEvaluationWindowPreset(
			params.get(QueryParams.evaluationWindowPreset),
		),
	};
}
