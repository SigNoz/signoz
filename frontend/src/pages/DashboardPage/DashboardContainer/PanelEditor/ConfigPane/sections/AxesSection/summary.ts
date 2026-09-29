import type { DashboardtypesAxesDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	SectionControlsOf,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import { joinSummary } from '../../utils/summary';

function describeRange({ softMin, softMax }: DashboardtypesAxesDTO): string {
	const hasMin = typeof softMin === 'number';
	const hasMax = typeof softMax === 'number';
	if (!hasMin && !hasMax) {
		return 'auto range';
	}
	return `${hasMin ? softMin : 'auto'} to ${hasMax ? softMax : 'auto'}`;
}

export function summarizeAxes(
	value: DashboardtypesAxesDTO | undefined,
	controls: SectionControlsOf<SectionKind.Axes>,
): string {
	return joinSummary([
		controls.logScale && (value?.isLogScale ? 'Log' : 'Linear'),
		controls.minMax && describeRange(value ?? {}),
	]);
}
