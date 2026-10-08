import { rangeUtil } from '@grafana/data';

const DEFAULT_DISCONNECT_DURATION = '1m';

/** The step interval (smallest meaningful gap), else 1m. */
export function defaultDisconnectDuration(stepInterval?: number): string {
	return stepInterval && stepInterval > 0
		? rangeUtil.secondsToHms(stepInterval)
		: DEFAULT_DISCONNECT_DURATION;
}

export function formatOpacity(opacity: number): string {
	return `${Math.round(opacity * 100)}%`;
}

export function formatPointSize(size: number): string {
	return `${size} px`;
}

export function formatPointSizeRange([min, max]: [number, number]): string {
	return `${min}–${max} px`;
}
