import type { AlertmanagertypesChannelEmailConfigDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesChannelEmailConfigDTO';
import type { AlertmanagertypesChannelGoogleChatConfigDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesChannelGoogleChatConfigDTO';
import type { AlertmanagertypesChannelIncidentIOConfigDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesChannelIncidentIOConfigDTO';
import type { AlertmanagertypesChannelJiraAuthDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesChannelJiraAuthDTO';
import type { AlertmanagertypesChannelJiraConfigDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesChannelJiraConfigDTO';
import type { AlertmanagertypesChannelJSMOpsConfigDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesChannelJSMOpsConfigDTO';
import type { AlertmanagertypesChannelMSTeamsConfigDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesChannelMSTeamsConfigDTO';
import type { AlertmanagertypesChannelOpsgenieConfigDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesChannelOpsgenieConfigDTO';
import type { AlertmanagertypesChannelPagerdutyConfigDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesChannelPagerdutyConfigDTO';
import type { AlertmanagertypesChannelSlackConfigDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesChannelSlackConfigDTO';
import type { AlertmanagertypesChannelTelegramConfigDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesChannelTelegramConfigDTO';
import type { AlertmanagertypesChannelWebhookConfigDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesChannelWebhookConfigDTO';
import { AlertmanagertypesChannelKindDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesChannelKindDTO';
import { AlertmanagertypesJiraDeploymentDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesJiraDeploymentDTO';

export const ChannelKind = AlertmanagertypesChannelKindDTO;
export type ChannelKind = AlertmanagertypesChannelKindDTO;

export const JiraDeployment = AlertmanagertypesJiraDeploymentDTO;
export type JiraDeployment = AlertmanagertypesJiraDeploymentDTO;

export type KeysOfUnion<T> = T extends unknown ? keyof T : never;

export type JiraFormSpec = Omit<
	AlertmanagertypesChannelJiraConfigDTO,
	'auth'
> & {
	auth?: AlertmanagertypesChannelJiraAuthDTO;
};

/** Merged so switching kind keeps the fields the kinds share. */
export type ChannelSpecFormValues = Partial<
	AlertmanagertypesChannelSlackConfigDTO &
		AlertmanagertypesChannelWebhookConfigDTO &
		AlertmanagertypesChannelEmailConfigDTO &
		AlertmanagertypesChannelPagerdutyConfigDTO &
		AlertmanagertypesChannelOpsgenieConfigDTO &
		AlertmanagertypesChannelMSTeamsConfigDTO &
		AlertmanagertypesChannelGoogleChatConfigDTO &
		JiraFormSpec &
		AlertmanagertypesChannelJSMOpsConfigDTO &
		AlertmanagertypesChannelIncidentIOConfigDTO &
		AlertmanagertypesChannelTelegramConfigDTO
>;

export const WebhookAuth = {
	none: 'none',
	basic: 'basic',
	bearer: 'bearer',
} as const;
export type WebhookAuth = (typeof WebhookAuth)[keyof typeof WebhookAuth];

export type ChannelFormValues = ChannelSpecFormValues & {
	name?: string;
	/** Never sent: the API reads the mode from which credentials are set. */
	webhookAuth?: WebhookAuth;
};
