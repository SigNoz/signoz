import { useMemo } from 'react';
import { useBottomStrip } from 'container/BottomStrip/useBottomStrip';
import { type StripItem, StripItemKind } from 'container/BottomStrip/types';
import { pluralize } from 'utils/pluralize';

interface UseAlertRulesStripInfoArgs {
	/** Rows on the current page, matching the table's own footer. */
	shownCount: number;
	totalCount: number;
}

export function useAlertRulesStripInfo({
	shownCount,
	totalCount,
}: UseAlertRulesStripInfoArgs): void {
	const items = useMemo<StripItem[]>(
		() => [
			{
				kind: StripItemKind.Text,
				text: `${shownCount} of ${pluralize(totalCount, 'rule')}`,
			},
		],
		[shownCount, totalCount],
	);

	useBottomStrip(items);
}
