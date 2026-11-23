/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesGoogleChatReceiverConfigDTO } from './alertmanagertypesGoogleChatReceiverConfigDTO';
import type { AlertmanagertypesIncidentIOReceiverConfigDTO } from './alertmanagertypesIncidentIOReceiverConfigDTO';
import type { AlertmanagertypesJiraReceiverConfigDTO } from './alertmanagertypesJiraReceiverConfigDTO';
import type { AlertmanagertypesJSMOpsReceiverConfigDTO } from './alertmanagertypesJSMOpsReceiverConfigDTO';
import type { AlertmanagertypesTelegramReceiverConfigDTO } from './alertmanagertypesTelegramReceiverConfigDTO';
import type { ConfigDiscordConfigDTO } from './configDiscordConfigDTO';
import type { ConfigEmailConfigDTO } from './configEmailConfigDTO';
import type { ConfigMattermostConfigDTO } from './configMattermostConfigDTO';
import type { ConfigMSTeamsConfigDTO } from './configMSTeamsConfigDTO';
import type { ConfigMSTeamsV2ConfigDTO } from './configMSTeamsV2ConfigDTO';
import type { ConfigOpsGenieConfigDTO } from './configOpsGenieConfigDTO';
import type { ConfigPagerdutyConfigDTO } from './configPagerdutyConfigDTO';
import type { ConfigPushoverConfigDTO } from './configPushoverConfigDTO';
import type { ConfigRocketchatConfigDTO } from './configRocketchatConfigDTO';
import type { ConfigSlackConfigDTO } from './configSlackConfigDTO';
import type { ConfigSNSConfigDTO } from './configSNSConfigDTO';
import type { ConfigVictorOpsConfigDTO } from './configVictorOpsConfigDTO';
import type { ConfigWebexConfigDTO } from './configWebexConfigDTO';
import type { ConfigWebhookConfigDTO } from './configWebhookConfigDTO';
import type { ConfigWechatConfigDTO } from './configWechatConfigDTO';

export interface AlertmanagertypesReceiverDTO {
	/**
	 * @type array
	 */
	discord_configs?: ConfigDiscordConfigDTO[];
	/**
	 * @type array
	 */
	email_configs?: ConfigEmailConfigDTO[];
	/**
	 * @type array
	 */
	googlechat_configs?: AlertmanagertypesGoogleChatReceiverConfigDTO[];
	/**
	 * @type array
	 */
	incidentio_configs?: AlertmanagertypesIncidentIOReceiverConfigDTO[];
	/**
	 * @type array
	 */
	jira_configs?: AlertmanagertypesJiraReceiverConfigDTO[];
	/**
	 * @type array
	 */
	jsmops_configs?: AlertmanagertypesJSMOpsReceiverConfigDTO[];
	/**
	 * @type array
	 */
	mattermost_configs?: ConfigMattermostConfigDTO[];
	/**
	 * @type array
	 */
	msteams_configs?: ConfigMSTeamsConfigDTO[];
	/**
	 * @type array
	 */
	msteamsv2_configs?: ConfigMSTeamsV2ConfigDTO[];
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type array
	 */
	opsgenie_configs?: ConfigOpsGenieConfigDTO[];
	/**
	 * @type array
	 */
	pagerduty_configs?: ConfigPagerdutyConfigDTO[];
	/**
	 * @type array
	 */
	pushover_configs?: ConfigPushoverConfigDTO[];
	/**
	 * @type array
	 */
	rocketchat_configs?: ConfigRocketchatConfigDTO[];
	/**
	 * @type array
	 */
	slack_configs?: ConfigSlackConfigDTO[];
	/**
	 * @type array
	 */
	sns_configs?: ConfigSNSConfigDTO[];
	/**
	 * @type array
	 */
	telegram_configs?: AlertmanagertypesTelegramReceiverConfigDTO[];
	/**
	 * @type array
	 */
	victorops_configs?: ConfigVictorOpsConfigDTO[];
	/**
	 * @type array
	 */
	webex_configs?: ConfigWebexConfigDTO[];
	/**
	 * @type array
	 */
	webhook_configs?: ConfigWebhookConfigDTO[];
	/**
	 * @type array
	 */
	wechat_configs?: ConfigWechatConfigDTO[];
}
