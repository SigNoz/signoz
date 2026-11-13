/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { AlertmanagertypesTestableNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';

/** Every test send the form made since the story mounted, oldest first. */
const testRequests: AlertmanagertypesTestableNotificationChannelDTO[] = [];

export const recordChannelTestRequest = (
	request: AlertmanagertypesTestableNotificationChannelDTO,
): void => {
	testRequests.push(request);
};

export const channelTestRequests =
	(): readonly AlertmanagertypesTestableNotificationChannelDTO[] => testRequests;

export const resetChannelTestRequests = (): void => {
	testRequests.length = 0;
};
