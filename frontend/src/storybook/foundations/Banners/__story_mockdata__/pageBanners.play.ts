/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, within } from 'storybook/test';

import type { GlobalMockArgs } from '@/storybook/globals';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';
import type { createAlertMocks } from 'pages/CreateAlert/stories/CreateAlert.stories.mocks';
import type { meterMocks } from 'pages/MeterExplorer/stories/MeterExplorer.stories.mocks';
import { hasPendingRule } from 'pages/MetricsExplorer/stories/__story_mockdata__/metricsExplorer';
import type { metricsMocks } from 'pages/MetricsExplorer/stories/MetricsExplorerPage.stories.mocks';

type CreateAlertArgs = PageStoryArgs<typeof createAlertMocks>;
type MeterArgs = PageStoryArgs<typeof meterMocks>;
type MetricsArgs = PageStoryArgs<typeof metricsMocks>;

/** The pages fetch before they render, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/** A restricted license banner swaps the cloud license for a self-hosted one. */
const isCloud = ({
	license,
	banner,
}: Pick<GlobalMockArgs, 'license' | 'banner'>): boolean =>
	license === 'cloud' && !/^(license|evaluation)-/.test(banner);

export const showsPendingActivation = async ({
	args,
}: {
	args: Pick<
		MetricsArgs,
		| 'tab'
		| 'drawer'
		| 'drawerMetric'
		| 'rules'
		| 'pendingRules'
		| 'volumeControl'
		| 'license'
		| 'dataState'
	>;
}): Promise<void> => {
	const licensed = args.license === 'cloud' || args.license === 'enterprise';

	if (
		!licensed ||
		!args.volumeControl ||
		args.tab !== 'summary' ||
		args.drawer !== 'details' ||
		args.dataState !== 'loaded' ||
		!hasPendingRule(args.drawerMetric, args.rules, args.pendingRules)
	) {
		return;
	}

	await screen.findByTestId(
		'volume-control-pending-banner',
		undefined,
		untilLoaded,
	);
};

export const showsCancelSubscription = async ({
	args,
}: {
	args: Pick<GlobalMockArgs, 'license' | 'banner' | 'dataState'>;
}): Promise<void> => {
	if (!isCloud(args)) {
		return;
	}

	await screen.findByTestId('cancel-subscription-btn', undefined, untilLoaded);

	// The usage table pushes the banner down once it lands, so the scroll waits
	// for it. A revoked read permission never renders it.
	if (args.dataState !== 'loading') {
		await screen
			.findByText(/Billing metrics are updated once every 24 hours/, undefined, {
				timeout: 5_000,
			})
			.catch(() => undefined);
	}

	// The button is swapped once its permission check answers, so it is looked up
	// again.
	screen.getByTestId('cancel-subscription-btn').scrollIntoView({
		block: 'center',
	});
};

export const showsClickHouseInfo = async ({
	canvasElement,
	args,
}: {
	canvasElement: HTMLElement;
	args: Pick<CreateAlertArgs, 'alertMode'>;
}): Promise<void> => {
	// The picker has no query section, and anomaly rules disable the tab.
	if (args.alertMode === 'select-type' || args.alertMode === 'anomaly') {
		return;
	}

	await userEvent.click(
		await within(canvasElement).findByTestId(
			'clickhouse-tab',
			undefined,
			untilLoaded,
		),
	);
	const link = await screen.findByText(
		/Learn to write faster, optimized queries/,
		undefined,
		untilLoaded,
	);

	link.scrollIntoView({ block: 'center' });
};

type MeterNoticeArgs = Pick<
	MeterArgs,
	'tab' | 'timeRange' | 'license' | 'banner' | 'billingNotice'
>;

/** The notices sit on the Meter tab and are decided before any data lands. */
const meterNotice =
	(text: RegExp, isShown: (args: MeterNoticeArgs) => boolean) =>
	async ({ args }: { args: MeterNoticeArgs }): Promise<void> => {
		if (args.tab !== 'meter') {
			return;
		}

		if (isShown(args)) {
			await screen.findByText(text, undefined, untilLoaded);
			return;
		}

		await screen.findByTestId(
			'meter-breakdown-section-total',
			undefined,
			untilLoaded,
		);
		await expect(screen.queryByText(text)).not.toBeInTheDocument();
	};

export const showsMeterBillingNotice = meterNotice(
	/Billing is calculated in UTC/,
	({ billingNotice }) => billingNotice,
);

export const showsMeterBeforeLaunch = meterNotice(
	/Meter module data is accurate only from 22nd August 2025/,
	(args) => isCloud(args) && args.timeRange === 'august-2025',
);

export const showsMeterShortWindow = meterNotice(
	/Meter metrics data is aggregated over 1 hour period/,
	({ timeRange }) => timeRange === 'last-30-minutes',
);

export const showsTopLevelOperationsThreshold = async (): Promise<void> => {
	await screen.findByText(
		/SigNoz calculates the RED metrics for a service/,
		undefined,
		untilLoaded,
	);
};
