import type { Meta, StoryObj } from '@storybook/react-vite';
import { changelog } from 'components/ChangelogModal/stories/__story_mockdata__/changelog';
import ROUTES from 'constants/routes';

import type { GlobalMockArgs } from '../globals';

/** A page with a heading and nothing else, so the shell is what the story shows. */
function PlaceholderPage(): JSX.Element {
	return (
		<div style={{ padding: 16 }}>
			<h1>Placeholder page</h1>
			<p>The content area the shell gives every page.</p>
		</div>
	);
}

/**
 * The shell every page renders in: the side nav, the banners above it, the top
 * nav and the content area, and the bottom strip.
 *
 * Route: every page inside the app shell; these stories use `/services`, where
 * the top nav carries the time picker.
 */
const meta = {
	title: 'Foundations/App Layout',
	component: PlaceholderPage,
	parameters: { signoz: { route: ROUTES.APPLICATION, layout: 'app' } },
} satisfies Meta<GlobalMockArgs>;

export default meta;

type Story = StoryObj<GlobalMockArgs>;

/** The shell with the side nav pinned open. */
export const Default: Story = {};

/** The side nav collapsed to its rail. */
export const CollapsedSideNav: Story = {
	args: { sidenav: 'collapsed' },
};

/** The trial banner above the shell. */
export const TrialBanner: Story = {
	args: { banner: 'trial-expiry' },
};

/** The changelog modal over the shell, the way a new version opens it. */
export const Changelog: Story = {
	parameters: {
		signoz: {
			route: ROUTES.APPLICATION,
			layout: 'app',
			appContext: { changelog, showChangelogModal: true },
		},
	},
};
