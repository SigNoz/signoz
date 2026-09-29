import { useMemo } from 'react';
import { ChartNoAxesGantt, TriangleAlert } from '@signozhq/icons';
import {
	type StripItem,
	StripItemKind,
	StripTone,
} from 'container/BottomStrip/types';

interface UseStripInfoArgs {
	totalSpansCount: number;
	totalErrorSpansCount: number;
}

/**
 * Takes the counts rather than fetching them: the trace query key includes the
 * selected span, so a fetch here would fire on every span click.
 */
export function useStripInfo({
	totalSpansCount,
	totalErrorSpansCount,
}: UseStripInfoArgs): StripItem[] {
	return useMemo(
		() => [
			{
				kind: StripItemKind.KeyValue,
				label: 'Spans',
				value: totalSpansCount,
				prefix: <ChartNoAxesGantt size={13} />,
			},
			{
				kind: StripItemKind.KeyValue,
				label: 'Errors',
				value: totalErrorSpansCount,
				prefix: <TriangleAlert size={13} />,
				tone: totalErrorSpansCount > 0 ? StripTone.Error : StripTone.Default,
			},
		],
		[totalSpansCount, totalErrorSpansCount],
	);
}
