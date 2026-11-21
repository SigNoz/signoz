/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardGridLayoutSpecDTO } from './dashboardGridLayoutSpecDTO';
import type { DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTOKind } from './dashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTOKind';

export interface DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTO {
	/**
	 * @enum Grid
	 * @type string
	 * @description The layout kind.
	 */
	kind: DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTOKind;
	/**
	 * @description The grid section: an optional display title and up to 100 items that place panels. Each item has a content.$ref of #/spec/panels/<id> plus x, y, width and height on a 12-column grid: x and y at least 0, width and height at least 1, x plus width at most 12, and no two items overlapping.
	 */
	spec: DashboardGridLayoutSpecDTO;
}
