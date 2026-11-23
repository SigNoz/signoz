/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelWebhookConfigDTOKind } from './alertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelWebhookConfigDTOKind';
import type { AlertmanagertypesChannelWebhookConfigDTO } from './alertmanagertypesChannelWebhookConfigDTO';

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelWebhookConfigDTO {
	/**
	 * @enum webhook
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelWebhookConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelWebhookConfigDTO;
}
