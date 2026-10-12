import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	dashboardMocks,
	expectDisabled,
	menuItem,
	openActionsMenu,
	toolbarButton,
} from '../DashboardPage.stories.mocks';

import DashboardPage from '../../DashboardPage';

type DashboardArgs = PageStoryArgs<typeof dashboardMocks>;

const pageStory = storyMocks(dashboardMocks, { layout: 'app' });

/**
 * The dashboard with one permission missing at a time. Every story here is an
 * admin denied exactly what its name says. `read` decides whether the page
 * renders at all; `update` is every edit, the settings drawer included, so
 * Configure is as far as a user without it gets.
 *
 * Route: `/dashboard/:dashboardId`.
 */
const meta = {
	title: 'Pages/Dashboards/Detail/Authz',
	tags: ['authz', 'play'],
	component: DashboardPage as ComponentType<DashboardArgs>,
	render: (): JSX.Element => (
		<Route path={ROUTES.DASHBOARD} component={DashboardPage} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<DashboardArgs>;

export default meta;

type Story = StoryObj<DashboardArgs>;

const READ = 'read:dashboard';
const UPDATE = 'update:dashboard';
const DELETE = 'delete:dashboard';
const CREATE = 'create:dashboard';

/** The page refuses to render: `read` is the one check it mounts on. */
export const NoRead: Story = {
	args: { revoked: [READ] },
	play: async () => {
		await screen.findByText('Uh-oh! You are not authorized', undefined, {
			timeout: 10000,
		});
	},
};

/**
 * The panels still render, and Configure and New Panel stay in the toolbar,
 * disabled.
 */
export const NoUpdate: Story = {
	args: { revoked: [UPDATE] },
	play: async ({ canvasElement }) => {
		await expectDisabled(await toolbarButton(canvasElement, 'Configure'));
		await expectDisabled(await toolbarButton(canvasElement, 'New Panel'));
	},
};

/** The same toolbar with its tooltips open, each naming what is missing. */
export const TooltipsWithoutUpdate: Story = {
	args: { revoked: [UPDATE], tooltipsOpen: true },
	play: NoUpdate.play,
};

/**
 * A locked dashboard the user could not have edited anyway: the tooltips name
 * the permission rather than the lock.
 */
export const TooltipsWithoutUpdateWhenLocked: Story = {
	args: { revoked: [UPDATE], locked: true, tooltipsOpen: true },
	play: NoUpdate.play,
};

/** The Actions menu: rename, lock and new section locked; clone and delete open. */
export const NoUpdateActionsMenu: Story = {
	args: { revoked: [UPDATE] },
	play: async ({ canvasElement }) => {
		await openActionsMenu(canvasElement);
		await expectDisabled(menuItem('Rename'));
		await expectDisabled(menuItem('Lock dashboard'));
		await expectDisabled(menuItem('New section'));
		await expectDisabled(menuItem('Clone dashboard'), false);
		await expectDisabled(menuItem('Delete dashboard'), false);
	},
};

/** A panel's menu: view and download stay, every edit is locked. */
export const NoUpdatePanelMenu: Story = {
	args: { revoked: [UPDATE] },
	play: async ({ canvasElement }) => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'panel-actions-p99-latency',
				{},
				{ timeout: 10000 },
			),
		);
		const menu = await screen.findByRole('menu');

		await expectDisabled(
			within(menu).getByRole('menuitem', { name: /Edit panel/ }),
		);
		await expectDisabled(
			within(menu).getByRole('menuitem', { name: /Delete panel/ }),
		);
	},
};

/** The JSON editor opens read-only, and Apply says why it is locked. */
export const NoUpdateJsonEditor: Story = {
	args: { revoked: [UPDATE], tooltipsOpen: true },
	play: async ({ canvasElement }) => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'edit-json',
				{},
				{ timeout: 10000 },
			),
		);
		await expectDisabled(await screen.findByTestId('json-editor-apply'));
	},
};

/** A blank dashboard whose add-panel prompts are locked. */
export const NoUpdateEmpty: Story = {
	args: { revoked: [UPDATE], panels: 0, sectioned: false },
	play: async () => {
		await expectDisabled(
			await screen.findByTestId('add-panel', {}, { timeout: 10000 }),
		);
	},
};

/** Delete dashboard locked in the Actions menu; every edit still works. */
export const NoDelete: Story = {
	args: { revoked: [DELETE] },
	play: async ({ canvasElement }) => {
		await openActionsMenu(canvasElement);
		await expectDisabled(menuItem('Delete dashboard'));
		await expectDisabled(menuItem('Rename'), false);
	},
};

/** Cloning is a create, so the copy is locked while the original stays editable. */
export const NoCreate: Story = {
	args: { revoked: [CREATE] },
	play: async ({ canvasElement }) => {
		await openActionsMenu(canvasElement);
		await expectDisabled(menuItem('Clone dashboard'));
		await expectDisabled(menuItem('Rename'), false);
	},
};

/** Everything but reading: the Actions menu with only full screen left. */
export const ReadOnly: Story = {
	args: { revoked: [UPDATE, DELETE, CREATE] },
	play: async ({ canvasElement }) => {
		await openActionsMenu(canvasElement);
		await expectDisabled(menuItem('Clone dashboard'));
		await expectDisabled(menuItem('Delete dashboard'));
		await expectDisabled(menuItem('Full screen'), false);
	},
};

/**
 * The page holds on its spinner until the permission check answers. The
 * spinner's `Loading dashboard...` tip never shows: antd only renders a tip
 * around nested content.
 */
export const CheckLoading: Story = {
	args: { authzState: 'loading' },
	play: async ({ canvasElement }) => {
		await waitFor(() =>
			expect(canvasElement.querySelector('.ant-spin')).not.toBeNull(),
		);
	},
};

/**
 * The permission check failing rather than denying: the page renders, and
 * every edit stays locked as if `update` were denied.
 */
export const CheckFailed: Story = {
	args: { authzState: 'error' },
	// The mocked check intentionally fails; the resulting console error is the
	// point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }) => {
		await expectDisabled(await toolbarButton(canvasElement, 'Configure'));
	},
};
