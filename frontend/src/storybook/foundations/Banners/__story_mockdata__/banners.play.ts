/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import removeLocalStorageKey from 'api/browser/localstorage/remove';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { AppShellArgs } from '@/storybook/globals/appShellMocks';

type Banner = AppShellArgs['banner'];

interface PlayContext {
	args: Pick<AppShellArgs, 'banner'>;
}

export const NO_AUTH_STORAGE_KEY = 'no-auth-banner-v1';

const NO_AUTH_BANNER = 'no-auth-banner';

/** The shell renders its banners after the license and the trial settle. */
const untilLoaded = { timeout: 10_000 };

const TRIAL = /You are in free trial period/;
const PAYMENT_FAILED = /Your bill payment has failed/;
const LICENSE_EXPIRED = /Your SigNoz license has expired/;

const BANNER_TEXT: Record<Exclude<Banner, 'none' | 'no-auth'>, RegExp[]> = {
	'trial-expiry': [TRIAL],
	'payment-failed': [PAYMENT_FAILED],
	'license-expired': [LICENSE_EXPIRED],
	'license-terminated': [/Your SigNoz license is terminated/],
	'license-cancelled': [/Your SigNoz license is cancelled/],
	'license-defaulted': [/Your SigNoz license is defaulted/],
	'evaluation-expired': [/Your SigNoz trial has ended/],
	'license-expired-with-trial': [LICENSE_EXPIRED, TRIAL],
	'license-expired-with-payment-failed': [LICENSE_EXPIRED, PAYMENT_FAILED],
};

/** A dismissal is kept in `localStorage`, so it would outlive the story. */
export const forgetNoAuthDismissal = (): void => {
	removeLocalStorageKey(NO_AUTH_STORAGE_KEY);
};

export const showsBanner = async ({ args }: PlayContext): Promise<void> => {
	if (args.banner === 'none') {
		return;
	}

	if (args.banner === 'no-auth') {
		await screen.findByTestId(NO_AUTH_BANNER, undefined, untilLoaded);
		return;
	}

	await Promise.all(
		BANNER_TEXT[args.banner].map((text) =>
			screen.findByText(text, undefined, untilLoaded),
		),
	);
};

export const dismissNoAuthBanner = async ({
	args,
}: PlayContext): Promise<void> => {
	if (args.banner !== 'no-auth') {
		await showsBanner({ args });
		return;
	}

	const banner = await screen.findByTestId(
		NO_AUTH_BANNER,
		undefined,
		untilLoaded,
	);

	await userEvent.click(within(banner).getByRole('button'));
	await waitFor(() =>
		expect(screen.queryByTestId(NO_AUTH_BANNER)).not.toBeInTheDocument(),
	);
};
