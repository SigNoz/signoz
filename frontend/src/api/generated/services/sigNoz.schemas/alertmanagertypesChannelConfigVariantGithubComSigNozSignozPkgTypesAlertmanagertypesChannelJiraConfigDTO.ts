/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJiraConfigDTOKind } from './alertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJiraConfigDTOKind';
import type { AlertmanagertypesChannelJiraConfigDTO } from './alertmanagertypesChannelJiraConfigDTO';

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJiraConfigDTO {
	/**
	 * @enum jira
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJiraConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelJiraConfigDTO;
}
