import type { MessageActionDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import {
	ApplyFilterSignalDTO,
	SavedViewEntityDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { DataSource } from 'types/common/queryBuilder';

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
	const source = entityToDataSource(value);
	switch (source) {
		case DataSource.LOGS:
			return SavedViewEntityDTO.logs;
		case DataSource.TRACES:
			return SavedViewEntityDTO.traces;
		case DataSource.METRICS:
			return SavedViewEntityDTO.metrics;
		case 'meter':
			return SavedViewEntityDTO.meter;
		default:
			return null;
	}
}

/**
 * Maps an action `entity` to an explorer `DataSource` for saved-view lookups.
 * Accepts both short (`logs`) and taxonomy (`logs_explorer`) values.
 */
export function entityToDataSource(
	entity: SavedViewEntityDTO | string,
): DataSource | 'meter' | null {
	const normalized = entity.trim().toLowerCase().replace(/-/g, '_');

	switch (normalized) {
		case SavedViewEntityDTO.logs:
		case ResourceType.logs_explorer:
			return DataSource.LOGS;
		case SavedViewEntityDTO.traces:
		case ResourceType.traces_explorer:
			return DataSource.TRACES;
		case SavedViewEntityDTO.metrics:
		case ResourceType.metrics_explorer:
			return DataSource.METRICS;
		case SavedViewEntityDTO.meter:
			return 'meter';
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
): DataSource | 'meter' | null {
	const entity = resolveActionEntity(action);
	if (entity) {
		const fromEntity = entityToDataSource(entity);
		if (fromEntity) {
			return fromEntity;
		}
	}

	if (action.signal) {
		switch (action.signal) {
			case ApplyFilterSignalDTO.logs:
				return DataSource.LOGS;
			case ApplyFilterSignalDTO.traces:
				return DataSource.TRACES;
			case ApplyFilterSignalDTO.metrics:
				return DataSource.METRICS;
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
