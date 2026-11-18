import {
	type MessageActionDTO,
	MessageActionKindDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

import {
	isSavedViewOpenAction,
	resolveOpenResourceType,
	resolveResourceId,
} from './resolveOpenResource';
import { resourceRoute } from './resourceRoute';

export interface OpenResourceTarget {
	path: string;
	resourceType: string;
	resourceId: string;
}

// Saved views return null so they're never disabled: reopening one resets the explorer to the saved query.
export function getOpenResourceTarget(
	action: MessageActionDTO,
): OpenResourceTarget | null {
	if (
		action.kind !== MessageActionKindDTO.open_resource ||
		isSavedViewOpenAction(action)
	) {
		return null;
	}
	const resourceType = resolveOpenResourceType(action);
	const resourceId = resolveResourceId(action);
	if (!resourceType || !resourceId) {
		return null;
	}
	const path = resourceRoute(resourceType, resourceId);
	if (!path) {
		return null;
	}
	return { path, resourceType, resourceId };
}
