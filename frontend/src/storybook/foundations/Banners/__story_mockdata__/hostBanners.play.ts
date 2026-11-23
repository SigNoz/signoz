/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { AppShellArgs } from '@/storybook/globals/appShellMocks';

import { showsBanner } from './banners.play';

type HostArgs = Pick<AppShellArgs, 'banner' | 'license'>;

interface HostPlayContext<TArgs extends HostArgs> {
	mount: () => Promise<unknown>;
	args: TArgs;
	canvasElement: HTMLElement;
}

type OpenOverlay<TArgs extends HostArgs> = (context: {
	args: TArgs;
	canvasElement: HTMLElement;
}) => Promise<void>;

/**
 * Mounts the host, waits for the trial banner, then opens the host's own
 * overlay. `mount` is destructured so a control change replays all of it.
 */
export const withTrialBanner =
	<TArgs extends HostArgs>(openOverlay?: OpenOverlay<TArgs>) =>
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
