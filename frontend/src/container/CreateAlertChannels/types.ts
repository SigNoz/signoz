import {
	AlertmanagertypesChannelEmailConfigDTO,
	AlertmanagertypesChannelGoogleChatConfigDTO,
	AlertmanagertypesChannelIncidentIOConfigDTO,
	AlertmanagertypesChannelJiraConfigDTO,
	AlertmanagertypesChannelJSMOpsConfigDTO,
	AlertmanagertypesChannelKindDTO,
	AlertmanagertypesChannelMSTeamsConfigDTO,
	AlertmanagertypesChannelOpsgenieConfigDTO,
	AlertmanagertypesChannelPagerdutyConfigDTO,
	AlertmanagertypesChannelSlackConfigDTO,
	AlertmanagertypesChannelWebhookConfigDTO,
} from 'api/generated/services/sigNoz.schemas';

/** The API's own vocabulary for a channel's kind. */
export const ChannelKind = AlertmanagertypesChannelKindDTO;
export type ChannelKind = AlertmanagertypesChannelKindDTO;

/**
 * Every kind's spec merged into one object, so switching kind mid-form keeps the
 * fields the kinds share (title, text, description). Each field is typed by the
 * generated schema, so what is optional here is what the API models as optional.
 */
export type ChannelSpecFormValues = Partial<
	AlertmanagertypesChannelSlackConfigDTO &
		AlertmanagertypesChannelWebhookConfigDTO &
		AlertmanagertypesChannelEmailConfigDTO &
		AlertmanagertypesChannelPagerdutyConfigDTO &
		AlertmanagertypesChannelOpsgenieConfigDTO &
		AlertmanagertypesChannelMSTeamsConfigDTO &
		AlertmanagertypesChannelGoogleChatConfigDTO &
		AlertmanagertypesChannelJiraConfigDTO &
		AlertmanagertypesChannelJSMOpsConfigDTO &
		AlertmanagertypesChannelIncidentIOConfigDTO
>;

/**
 * The form edits a spec plus the channel's display name, which the API carries
 * outside the config.
 */
export type ChannelFormValues = ChannelSpecFormValues & {
	name?: string;
};
