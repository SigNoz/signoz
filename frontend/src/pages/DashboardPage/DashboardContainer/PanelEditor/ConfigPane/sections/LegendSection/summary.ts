import type { DashboardtypesLegendDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	SectionControlsOf,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import { countSummary, joinSummary } from '../../utils/summary';
import { POSITION_OPTIONS } from './options';

export function summarizeLegend(
	value: DashboardtypesLegendDTO | undefined,
	controls: SectionControlsOf<SectionKind.Legend>,
): string {
	const position =
		POSITION_OPTIONS.find((option) => option.value === value?.position) ??
		POSITION_OPTIONS[0];
	return joinSummary([
		controls.position && position.label,
		countSummary(Object.keys(value?.customColors ?? {}), 'custom color'),
	]);
}
