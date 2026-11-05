// Units of Prometheus `model.Duration`, the duration grammar the API accepts.
export const PROMETHEUS_DURATION_UNIT_MS: Record<string, number> = {
	ms: 1,
	s: 1_000,
	m: 60_000,
	h: 3_600_000,
	d: 86_400_000,
	w: 604_800_000,
	y: 31_536_000_000,
};
const DURATION_RE = /^(\d+(ms|s|m|h|d|w|y))+$/;
const DURATION_TOKEN_RE = /(\d+)(ms|s|m|h|d|w|y)/g;

/** Milliseconds in a Prometheus duration such as `1h30m`, or null when it is not one. */
export function prometheusDurationToMs(value: string): number | null {
	if (!DURATION_RE.test(value)) {
		return null;
	}
	let totalMs = 0;
	for (const [, amount, unit] of value.matchAll(DURATION_TOKEN_RE)) {
		totalMs += Number(amount) * PROMETHEUS_DURATION_UNIT_MS[unit];
	}
	return totalMs;
}
