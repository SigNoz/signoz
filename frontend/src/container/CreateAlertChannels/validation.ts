import { TFunction } from 'i18next';
import type { ZodType } from 'zod';

import { emailSchema } from './schemas/email';
import { googleChatSchema } from './schemas/googlechat';
import { incidentIOSchema } from './schemas/incidentio';
import { jiraSchema } from './schemas/jira';
import { jsmOpsSchema } from './schemas/jsmops';
import { msTeamsSchema } from './schemas/msteams';
import { opsgenieSchema } from './schemas/opsgenie';
import { pagerdutySchema } from './schemas/pagerduty';
import { channelNameSchema } from './schemas/shared';
import { slackSchema } from './schemas/slack';
import { telegramSchema } from './schemas/telegram';
import { webhookSchema } from './schemas/webhook';
import { ChannelFormValues, ChannelKind } from './types';

export const CHANNEL_SCHEMAS: Record<ChannelKind, ZodType> = {
	[ChannelKind.slack]: slackSchema,
	[ChannelKind.webhook]: webhookSchema,
	[ChannelKind.pagerduty]: pagerdutySchema,
	[ChannelKind.opsgenie]: opsgenieSchema,
	[ChannelKind.jsmops]: jsmOpsSchema,
	[ChannelKind.email]: emailSchema,
	[ChannelKind.msteams]: msTeamsSchema,
	[ChannelKind.googlechat]: googleChatSchema,
	[ChannelKind.jira]: jiraSchema,
	[ChannelKind.incidentio]: incidentIOSchema,
	[ChannelKind.telegram]: telegramSchema,
};

export function validateChannel(
	kind: ChannelKind,
	values: ChannelFormValues,
	t: TFunction,
): string | null {
	const nameResult = channelNameSchema.safeParse(values);
	if (!nameResult.success) {
		return t(nameResult.error.issues[0].message);
	}

	const schema = CHANNEL_SCHEMAS[kind];
	if (!schema) {
		return t('selected_channel_invalid');
	}

	const result = schema.safeParse(values);
	return result.success ? null : t(result.error.issues[0].message);
}
