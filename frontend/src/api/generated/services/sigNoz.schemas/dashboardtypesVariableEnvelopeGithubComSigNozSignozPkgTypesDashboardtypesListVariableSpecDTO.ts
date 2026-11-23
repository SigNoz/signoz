/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesListVariableSpecDTO } from './dashboardtypesListVariableSpecDTO';
import type { DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTOKind } from './dashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTOKind';

export interface DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTO {
	/**
	 * @enum ListVariable
	 * @type string
	 * @description The variable kind.
	 */
	kind: DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTOKind;
	/**
	 * @description The kind-specific variable spec.
	 */
	spec: DashboardtypesListVariableSpecDTO;
}
