/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { Gaps, PanelArgs, PanelResult } from '../__story_mockdata__/types';

/** The dashboard document loads before the panel queries, then the chart sizes itself. */
export const PANEL_LOAD = { timeout: 15000 };

export interface PanelPlayArgs extends PanelArgs {
	result: PanelResult;
	series: number;
	listRows: number;
	gaps: Gaps;
	dataState: string;
}

/** Whether the panel was answered with something to draw. */
export const hasData = (args: PanelPlayArgs): boolean => {
	if (args.dataState !== 'loaded' || args.result === 'empty') {
		return false;
	}
	if (args.kind === 'List') {
		return args.listRows > 0;
	}

	return args.kind === 'Number' || args.kind === 'Text' || args.series > 0;
};
