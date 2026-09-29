import {
	DashboardtypesTextAlignDTO,
	type DashboardtypesTextPresentationDTO,
	DashboardtypesVerticalAlignDTO,
} from 'api/generated/services/sigNoz.schemas';
import { resolveTextBackground } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/resolveTextBackground';
import { PanelTheme } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/types';

import { alignmentLabel } from '../../controls/AlignmentGrid/alignment';
import { backgroundTitle } from './background';
import { joinSummary } from '../../utils/summary';

export function summarizeTextLayout(
	value: DashboardtypesTextPresentationDTO | undefined,
): string {
	return joinSummary([
		alignmentLabel({
			textAlign: value?.textAlign ?? DashboardtypesTextAlignDTO.left,
			verticalAlign: value?.verticalAlign ?? DashboardtypesVerticalAlignDTO.top,
		}),
		// Preset detection matches either theme's surface, so the theme is immaterial here.
		`${backgroundTitle(resolveTextBackground(value?.background, PanelTheme.Dark))} background`,
	]);
}
