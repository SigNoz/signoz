/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelGoogleChatConfigDTOKind } from './alertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelGoogleChatConfigDTOKind';
import type { AlertmanagertypesChannelGoogleChatConfigDTO } from './alertmanagertypesChannelGoogleChatConfigDTO';

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelGoogleChatConfigDTO {
	/**
	 * @enum googlechat
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelGoogleChatConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelGoogleChatConfigDTO;
}
