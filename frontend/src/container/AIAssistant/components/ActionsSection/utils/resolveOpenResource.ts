import type { MessageActionDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import {
	ApplyFilterSignalDTO,
	SavedViewEntityDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

import { ResourceType } from './resourceRoute';

function readString(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

/** Normalises backend resource-type strings to the taxonomy used in the UI. */
export function normalizeResourceType(
	resourceType: string | null | undefined,
): string | null {
	if (!resourceType) {
		return null;
	}

	const normalized = resourceType.trim().toLowerCase().replace(/-/g, '_');
	if (normalized === 'savedview') {
		return ResourceType.saved_view;
	}
	if (
		normalized === 'notification_channel' ||
		normalized === 'notificationchannel'
	) {
		return ResourceType.channel;
	}

	return normalized;
}

/** Reads a resource type from the action envelope or its `input` payload. */
export function resolveResourceType(action: MessageActionDTO): string | null {
	const direct = normalizeResourceType(action.resourceType);
	if (direct) {
		return direct;
	}

	const input = action.input;
	if (!input) {
		return null;
	}

	return (
		normalizeResourceType(readString(input.resourceType)) ??
		normalizeResourceType(readString(input.type))
	);
}

/**
 * Resolves the resource type for an `open_resource` action, including label-based
 * fallbacks when the backend only sends a display label + id.
 */
export function resolveOpenResourceType(
	action: MessageActionDTO,
): string | null {
	const fromFields = resolveResourceType(action);
	if (fromFields) {
		return fromFields;
	}

	if (/open\s+channel/i.test(action.label) && resolveResourceId(action)) {
		return ResourceType.channel;
	}

	return null;
}

/** Reads a resource id from `resourceId` or common `input` keys. */
export function resolveResourceId(action: MessageActionDTO): string | null {
	const direct = readString(action.resourceId);
	if (direct) {
		return direct;
	}

	const input = action.input;
	if (!input) {
		return null;
	}

	for (const key of [
		'resourceId',
		'viewId',
		'viewKey',
		'channelId',
		'id',
	] as const) {
		const value = readString(input[key]);
		if (value) {
			return value;
		}
	}

	return null;
}

/** Reads `entity` from the action envelope or its `input` payload. */
export function resolveActionEntity(
	action: MessageActionDTO,
): SavedViewEntityDTO | null {
	if (action.entity) {
		return action.entity;
	}

	const fromInput = readString(action.input?.entity);
	if (!fromInput) {
		return null;
	}

	return normalizeToSavedViewEntity(fromInput);
}

function normalizeToSavedViewEntity(value: string): SavedViewEntityDTO | null {
	const source = entityToSavedViewSource(value);
	switch (source) {
		case SavedviewtypesSourceDTO.logs:
			return SavedViewEntityDTO.logs;
		case SavedviewtypesSourceDTO.traces:
			return SavedViewEntityDTO.traces;
		case SavedviewtypesSourceDTO.metrics:
			return SavedViewEntityDTO.metrics;
		case SavedviewtypesSourceDTO.meter:
			return SavedViewEntityDTO.meter;
		default:
			return null;
	}
}

/**
 * Maps an action `entity` to the saved views api source for saved-view lookups.
 * Accepts both short (`logs`) and taxonomy (`logs_explorer`) values.
 */
export function entityToSavedViewSource(
	entity: SavedViewEntityDTO | string,
): SavedviewtypesSourceDTO | null {
	const normalized = entity.trim().toLowerCase().replace(/-/g, '_');

	switch (normalized) {
		case SavedViewEntityDTO.logs:
		case ResourceType.logs_explorer:
			return SavedviewtypesSourceDTO.logs;
		case SavedViewEntityDTO.traces:
		case ResourceType.traces_explorer:
			return SavedviewtypesSourceDTO.traces;
		case SavedViewEntityDTO.metrics:
		case ResourceType.metrics_explorer:
			return SavedviewtypesSourceDTO.metrics;
		case SavedViewEntityDTO.meter:
			return SavedviewtypesSourceDTO.meter;
		default:
			return null;
	}
}

/**
 * Picks which explorer source page to search when resolving a saved view.
 * Prefers `entity` (open_resource); falls back to `signal` only for legacy payloads.
 */
export function resolveSavedViewSourceHint(
	action: MessageActionDTO,
): SavedviewtypesSourceDTO | null {
	const entity = resolveActionEntity(action);
	if (entity) {
		const fromEntity = entityToSavedViewSource(entity);
		if (fromEntity) {
			return fromEntity;
		}
	}

	if (action.signal) {
		switch (action.signal) {
			case ApplyFilterSignalDTO.logs:
				return SavedviewtypesSourceDTO.logs;
			case ApplyFilterSignalDTO.traces:
				return SavedviewtypesSourceDTO.traces;
			case ApplyFilterSignalDTO.metrics:
				return SavedviewtypesSourceDTO.metrics;
			default: {
				const _exhaustive: never = action.signal;
				return _exhaustive;
			}
		}
	}

	return null;
}

export function isSavedViewOpenAction(action: MessageActionDTO): boolean {
	if (resolveResourceType(action) === ResourceType.saved_view) {
		return true;
	}

	// Defensive: some agent payloads only set a human label + id in `input`.
	return /open\s+view/i.test(action.label) && resolveResourceId(action) !== null;
}
