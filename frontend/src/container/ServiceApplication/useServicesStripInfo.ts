import { useMemo } from 'react';
import { useBottomStrip } from 'container/BottomStrip/useBottomStrip';
import { type StripItem, StripItemKind } from 'container/BottomStrip/types';
import { pluralize } from 'utils/pluralize';

export function useServicesStripInfo(count: number): void {
	const items = useMemo<StripItem[]>(
		() => [{ kind: StripItemKind.Text, text: pluralize(count, 'service') }],
		[count],
	);

	useBottomStrip(items);
}
