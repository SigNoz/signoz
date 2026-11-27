import { getRowBackgroundColor } from 'components/Logs/LogStateIndicator/getRowBackgroundColor';
import { LogType } from 'components/Logs/LogStateIndicator/LogStateIndicator';

import { AuditLog, AuditOutcome, AuditPrincipalType } from './AuditLogs.types';

export const EMPTY_VALUE = '—';

export function getOutcome(log: AuditLog): AuditOutcome {
	return log.attributes['signoz.audit.outcome'];
}

export function getRowHoverColor(isDarkMode: boolean, log: AuditLog): string {
	return getRowBackgroundColor(
		isDarkMode,
		getOutcome(log) === AuditOutcome.SUCCESS ? LogType.SUCCESS : LogType.ERROR,
	);
}

export function getPrincipalEmail(log: AuditLog): string {
	return log.attributes['signoz.principal.email'] || EMPTY_VALUE;
}

export function isServiceAccount(log: AuditLog): boolean {
	return (
		log.attributes['signoz.principal.type'] === AuditPrincipalType.SERVICE_ACCOUNT
	);
}

export function getEventName(log: AuditLog): string {
	return log.event_name || EMPTY_VALUE;
}

export function getResourceName(log: AuditLog): string {
	return log.resource.attributes['signoz.resource.kind'] || EMPTY_VALUE;
}

export function getResourceId(log: AuditLog): string {
	return log.resource.attributes['signoz.resource.id'] || EMPTY_VALUE;
}

export function truncateId(id: string, head = 4, tail = 4): string {
	if (id === EMPTY_VALUE || id.length <= head + tail + 1) {
		return id;
	}
	return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

export function getBody(log: AuditLog): string {
	return log.body || EMPTY_VALUE;
}

export function getVerb(log: AuditLog): string {
	return log.attributes['signoz.audit.verb'] || EMPTY_VALUE;
}
