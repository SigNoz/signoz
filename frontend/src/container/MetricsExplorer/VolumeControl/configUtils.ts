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

const COMPACT_UNITS = [
	{ threshold: 1e3, suffix: 'K' },
	{ threshold: 1e6, suffix: 'M' },
] as const;

function formatCompactUnit(value: number): string {
	for (const { threshold, suffix } of COMPACT_UNITS) {
		const formatted = (value / threshold).toFixed(1);
		if (Number(formatted) < 1e3) {
			return `${formatted}${suffix}`;
		}
	}
	return `${(value / 1e9).toFixed(1)}B`;
}

export function formatCompact(value: number): string {
	if (value >= 1e3) {
		return formatCompactUnit(value);
	}
	return `${value}`;
}

export function formatUsd(value: number): string {
	if (value >= 1e3) {
		return `$${formatCompactUnit(value)}`;
	}
	const fixed = value.toFixed(2);
	const rounded = Number(fixed);
	if (rounded >= 1e3) {
		return `$${formatCompactUnit(rounded)}`;
	}
	return `$${fixed}`;
}
