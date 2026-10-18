import type { DashboardtypesLegendDTOCustomOrder } from 'api/generated/services/sigNoz.schemas';

/**
 * Set the order index for `label`, returning a new customOrder record. `null` (an
 * emptied input) drops the entry; a fractional value is truncated, since the index is
 * an integer on the wire.
 */
export function setSeriesOrder(
	value: DashboardtypesLegendDTOCustomOrder | undefined,
	label: string,
	index: number | null,
): Record<string, number> {
	const next = { ...value };
	if (index === null) {
		delete next[label];
	} else {
		next[label] = Math.trunc(index);
	}
	return next;
}
