/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelEmailConfigDTOKind } from './alertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelEmailConfigDTOKind';
import type { AlertmanagertypesChannelEmailConfigDTO } from './alertmanagertypesChannelEmailConfigDTO';

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelEmailConfigDTO {
	/**
	 * @enum email
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelEmailConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelEmailConfigDTO;
}
