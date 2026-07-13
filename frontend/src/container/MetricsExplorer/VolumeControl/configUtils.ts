import {
	MetricreductionruletypesMatchTypeDTO,
	MetricreductionruletypesGettableReductionRuleDTO,
} from 'api/generated/services/sigNoz.schemas';

import { RuleMode } from './types';

export function modeFromRule(
	rule: MetricreductionruletypesGettableReductionRuleDTO | null | undefined,
): { mode: RuleMode; labels: string[] } {
	if (!rule) {
		return { mode: 'all', labels: [] };
	}
	return {
		mode:
			rule.matchType === MetricreductionruletypesMatchTypeDTO.keep
				? 'include'
				: 'exclude',
		labels: rule.labels ?? [],
	};
}

export function matchTypeForMode(
	mode: RuleMode,
): MetricreductionruletypesMatchTypeDTO {
	return mode === 'include'
		? MetricreductionruletypesMatchTypeDTO.keep
		: MetricreductionruletypesMatchTypeDTO.drop;
}

export function formatCompact(value: number): string {
	if (value >= 1e9) {
		return `${(value / 1e9).toFixed(1)}B`;
	}
	if (value >= 1e6) {
		return `${(value / 1e6).toFixed(1)}M`;
	}
	if (value >= 1e3) {
		return `${(value / 1e3).toFixed(1)}K`;
	}
	return `${value}`;
}

export function formatUsd(value: number): string {
	if (value >= 1e3) {
		return `$${(value / 1e3).toFixed(1)}K`;
	}
	return `$${value.toFixed(2)}`;
}
