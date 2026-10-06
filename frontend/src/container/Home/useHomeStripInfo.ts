import { useMemo } from 'react';
import { useGetAlerts } from 'api/generated/services/alerts';
import { useBottomStrip } from 'container/BottomStrip/useBottomStrip';
import { type StripItem, StripItemKind } from 'container/BottomStrip/types';
import { pluralize } from 'utils/pluralize';

export function useHomeStripInfo(): void {
	// Firing instances, not rules, matching the triggered alerts page.
	const { data } = useGetAlerts();

	const count = data?.data?.length ?? 0;

	const items = useMemo<StripItem[]>(
		() => [
			{ kind: StripItemKind.Text, text: `${pluralize(count, 'alert')} firing` },
		],
		[count],
	);

	useBottomStrip(items);
}
