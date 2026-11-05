import { useMemo } from 'react';
import { useBottomStrip } from 'container/BottomStrip/useBottomStrip';
import { type StripItem, StripItemKind } from 'container/BottomStrip/types';
import { pluralize } from 'utils/pluralize';

interface UseExceptionsStripInfoArgs {
	shownCount: number;
	totalCount: number;
}

export function useExceptionsStripInfo({
	shownCount,
	totalCount,
}: UseExceptionsStripInfoArgs): void {
	const items = useMemo<StripItem[]>(
		() => [
			{
				kind: StripItemKind.Text,
				text: `${shownCount} of ${pluralize(totalCount, 'exception')}`,
			},
		],
		[shownCount, totalCount],
	);

	useBottomStrip(items);
}
