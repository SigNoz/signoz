import { MetricreductionruletypesMatchTypeDTO } from 'api/generated/services/sigNoz.schemas';

export function isKeepMode(
	matchType: MetricreductionruletypesMatchTypeDTO,
): boolean {
	return matchType === MetricreductionruletypesMatchTypeDTO.keep;
}

export function getMatchTypeLabel(
	matchType: MetricreductionruletypesMatchTypeDTO,
): string {
	return isKeepMode(matchType) ? 'Include attributes' : 'Exclude attributes';
}

export function getLabelVerb(
	matchType: MetricreductionruletypesMatchTypeDTO,
): string {
	return isKeepMode(matchType) ? 'include' : 'exclude';
}
