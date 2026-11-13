/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { AppShellArgs } from '@/storybook/globals/appShellMocks';

import { showsBanner } from './banners.play';

interface HostPlayContext<TArgs extends Pick<AppShellArgs, 'banner'>> {
	mount: () => Promise<unknown>;
	args: TArgs;
	canvasElement: HTMLElement;
}

type OpenOverlay<TArgs extends Pick<AppShellArgs, 'banner'>> = (context: {
	args: TArgs;
	canvasElement: HTMLElement;
}) => Promise<void>;

/**
 * Mounts the host, waits for the trial banner, then opens the host's own
 * overlay. `mount` is destructured so a control change replays all of it.
 */
export const withTrialBanner =
	<TArgs extends Pick<AppShellArgs, 'banner'>>(
		openOverlay?: OpenOverlay<TArgs>,
	) =>
	async ({
		mount,
		args,
		canvasElement,
	}: HostPlayContext<TArgs>): Promise<void> => {
		await mount();

		if (args.banner === 'trial-expiry') {
			await showsBanner({ args });
		}

		await openOverlay?.({ args, canvasElement });
	};
