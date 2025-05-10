import { FunnelData } from 'types/api/traceFunnels';

export function filterFunnelsByQuery(
	funnels: FunnelData[],
	query: string,
): FunnelData[] {
	const q = query.trim().toLowerCase();
	if (!q) return funnels;

	return funnels.filter((funnel) =>
		(funnel.funnel_name || '').toLowerCase().includes(q),
	);
}
