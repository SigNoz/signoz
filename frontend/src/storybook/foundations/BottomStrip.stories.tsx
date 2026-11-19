import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';

import type { GlobalMockArgs } from '../globals';
import {
	openAddCardModal,
	openNozChatTabs,
	openNozHistory,
	openNozPanel,
	raiseToast,
} from './__story_mockdata__/bottomStrip.play';

/** A page that puts nothing in the strip, so the shell is all there is. */
function EmptyPage(): JSX.Element {
	return <div />;
}

/**
 * The strip along the foot of the shell: what the page puts on the left, the
 * build version when it puts nothing, and the shell's own Noz chat tabs, Ask
 * Noz, Noz history and Support on the right. Support follows the chat support
 * the workspace has, the way the floating bubble it replaces did.
 *
 * Route: every page inside the app shell; these stories use `/home`.
 */
const meta = {
	title: 'Foundations/Bottom Strip',
	tags: ['play'],
	component: EmptyPage,
	parameters: { signoz: { route: ROUTES.HOME, layout: 'app' } },
} satisfies Meta<GlobalMockArgs>;

export default meta;

type Story = StoryObj<GlobalMockArgs>;

/**
 * The build version on the left. With Noz off and no chat support configured,
 * the right side is empty.
 */
export const Default: Story = {};

/** Ask Noz and Support on the right, Support handing off to Pylon. */
export const Actions: Story = {
	args: { noz: true, support: 'pylon' },
};

/**
 * A cloud trial without a card, whose Support offers the Add Credit Card modal
 * rather than Pylon. The floating bubble that used to offer it is gone.
 */
export const AddCard: Story = {
	args: { noz: true, support: 'add-card' },
};

/** The Add Credit Card modal, opened from the strip's Support. */
export const AddCardModal: Story = {
	args: { noz: true, support: 'add-card' },
	play: openAddCardModal,
};

/**
 * The pulsing dot beside Ask Noz while conversations wait on an approval. The
 * top nav's Noz entry carries the same count.
 */
export const NozAwaitingYou: Story = {
	args: { noz: true, nozAwaiting: 2, support: 'pylon' },
};

/** The Noz chat opened from Ask Noz, floating above the strip; its header drags it. */
export const NozPanel: Story = {
	args: { noz: true, support: 'pylon' },
	play: openNozPanel,
};

/**
 * Recent conversations, opened from the history icon beside Ask Noz. Picking
 * one opens it in the Noz panel; with no saved conversation the icon is gone.
 */
export const NozHistory: Story = {
	args: { noz: true, nozThreads: 6, support: 'pylon' },
	play: openNozHistory,
};

/**
 * Open Noz chats as tabs beside Ask Noz, newest last; a dot marks a reply the
 * user has not seen yet.
 */
export const NozChats: Story = {
	args: { noz: true, nozChats: 4, nozUnread: 1, support: 'pylon' },
};

/**
 * Tabs opened in the Noz panel, the newest then the one before it: the open one
 * stays highlighted, the newest's dot clears, and each chat opens on its end.
 */
export const NozChatOpen: Story = {
	args: { noz: true, nozChats: 4, nozUnread: 1, support: 'pylon' },
	play: openNozChatTabs,
};

/** Every tooltip the strip carries, held open. */
export const Tooltips: Story = {
	args: { noz: true, support: 'pylon', tooltipsOpen: true },
};

/**
 * A toast above the strip. The toaster pins itself to the foot of the viewport,
 * so without an offset it lands on top of Ask Noz and Support.
 */
export const WithToast: Story = {
	args: { noz: true, support: 'pylon' },
	play: raiseToast,
};
