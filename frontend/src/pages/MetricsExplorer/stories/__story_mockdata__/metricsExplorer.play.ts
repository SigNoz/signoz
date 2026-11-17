/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	findSuggestion,
	openKeySuggestions,
	typeFilter,
} from 'components/QueryBuilderV2/QueryV2/QuerySearch/stories/__story_mockdata__/querySearch.play';
import { screen, userEvent } from 'storybook/test';

import {
	type MetricsArgs,
	saveUnit,
} from '../MetricsExplorerPage.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: MetricsArgs;
}

const showsMetricSearch = (args: MetricsArgs): boolean =>
	args.dataState === 'loaded' && args.tab !== 'volume-control';

export const openDashboardsMenu = async ({
	args,
}: PlayContext): Promise<void> => {
	if (
		args.tab !== 'summary' ||
		args.drawer !== 'details' ||
		args.dataState !== 'loaded' ||
		args.relatedAssets === 0
	) {
		return;
	}

	await userEvent.click(
		await screen.findByTestId(
			'metric-dashboards-popover',
			{},
			{ timeout: 10000 },
		),
	);
	await screen.findByRole('menu');
};

export const suggestFilterKeys = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsMetricSearch(args)) {
		return;
	}

	await openKeySuggestions(canvasElement, 'k8s.cluster.name');
};

export const suggestFilterValues = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsMetricSearch(args)) {
		return;
	}

	await typeFilter(canvasElement, 'service.name = ');
	await findSuggestion(canvasElement, 'checkout');
};

export const saveMetricUnit = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		args.tab !== 'explorer' ||
		args.dataState !== 'loaded' ||
		args.metricUnit !== 'unset' ||
		args.explorerMetrics !== 1
	) {
		return;
	}

	await saveUnit(
		canvasElement,
		args.unitSave === 'success'
			? 'Unit saved successfully'
			: 'Failed to save unit',
	);
};
