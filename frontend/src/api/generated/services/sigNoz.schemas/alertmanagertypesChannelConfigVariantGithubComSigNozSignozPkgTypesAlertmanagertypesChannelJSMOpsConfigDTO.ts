/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJSMOpsConfigDTOKind } from './alertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJSMOpsConfigDTOKind';
import type { AlertmanagertypesChannelJSMOpsConfigDTO } from './alertmanagertypesChannelJSMOpsConfigDTO';

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJSMOpsConfigDTO {
	/**
	 * @enum jsmops
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJSMOpsConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelJSMOpsConfigDTO;
}
