/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesTextVariableSpecDTO } from './dashboardtypesTextVariableSpecDTO';
import type { DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTOKind } from './dashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTOKind';

export interface DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTO {
	/**
	 * @enum TextVariable
	 * @type string
	 * @description The variable kind.
	 */
	kind: DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTOKind;
	/**
	 * @description The kind-specific variable spec.
	 */
	spec: DashboardtypesTextVariableSpecDTO;
}
