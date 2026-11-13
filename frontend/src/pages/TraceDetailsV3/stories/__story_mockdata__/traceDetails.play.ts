/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { TraceDetailsTab } from '../../constants';
import {
	type traceDetailsMocks,
	untilLoaded,
} from '../TraceDetailsV3.stories.mocks';

type TraceDetailsArgs = PageStoryArgs<typeof traceDetailsMocks>;

interface PlayContext {
	args: Pick<TraceDetailsArgs, 'missingSpans' | 'tab' | 'dataState'>;
}

/** The header reads the flag off the summary, and only the overview tab shows it. */
export const showsMissingSpansBanner = async ({
	args,
}: PlayContext): Promise<void> => {
	if (
		!args.missingSpans ||
		args.tab !== TraceDetailsTab.Overview ||
		args.dataState !== 'loaded'
	) {
		return;
	}

	await screen.findByText(
		/this trace has missing spans/i,
		undefined,
		untilLoaded,
	);
};
