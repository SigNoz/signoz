import type { Meta, StoryObj } from '@storybook/react-vite';
import dayjs from 'dayjs';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { ingestionMocks } from './Ingestion.stories.mocks';

import SettingsPage from '../../Settings';

type IngestionArgs = PageStoryArgs<typeof ingestionMocks>;

const pageStory = storyMocks(ingestionMocks, { layout: 'app' });

/**
 * Ingestion keys, their expiry and their per signal limits, against the gateway
 * that owns them.
 *
 * Route: `/settings/ingestion-settings`.
 */
const meta = {
	title: 'Pages/Settings/Ingestion',
	tags: ['play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<IngestionArgs>;

export default meta;

type Story = StoryObj<IngestionArgs>;

/** The list fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * The keys collectors send data with, and how much each one is allowed to send
 * per signal before the gateway starts rejecting.
 */
export const Default: Story = {};

/** A workspace that has not been given a key yet. */
export const NoKeys: Story = {
	args: { keys: 0 },
};

/** Keys the org has to rotate before their collectors stop being accepted. */
export const ExpiringKeys: Story = {
	args: { expiry: 'soon' },
};

/** Keys with no cap on any signal, which is what a fresh workspace looks like. */
export const NoLimits: Story = {
	args: { limits: [] },
};

/**
 * The same tab on a workspace without the gateway: the ingestion URL, key and
 * region it was handed, and nothing to manage.
 */
export const WithoutGateway: Story = {
	args: { gateway: false },
};

/** A key opened up: the caps per signal, and the usage against each. */
export const KeyLimits: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/production-us-east/i,
				undefined,
				untilLoaded,
			),
		);
		await screen.findByRole('button', { name: 'Edit logs limit' }, untilLoaded);
	},
};

async function openCreateKey(
	canvasElement: HTMLElement,
): Promise<ReturnType<typeof within>> {
	await userEvent.click(
		await within(canvasElement).findByText(
			'New Ingestion key',
			undefined,
			untilLoaded,
		),
	);
	return within(
		await screen.findByRole(
			'dialog',
			{ name: 'Create new ingestion key' },
			untilLoaded,
		),
	);
}

async function addTag(
	dialog: ReturnType<typeof within>,
	tag: string,
): Promise<void> {
	await userEvent.click(await dialog.findByRole('button', { name: /New Tag/ }));
	await userEvent.keyboard(`${tag}{Enter}`);
}

async function submitCreateKey(
	dialog: ReturnType<typeof within>,
): Promise<void> {
	await userEvent.type(dialog.getByLabelText('Name'), 'otel-collectors');
	await userEvent.click(dialog.getByLabelText('Expiration'));
	await userEvent.click(
		await screen.findByTitle(dayjs().add(1, 'day').format('YYYY-MM-DD')),
	);
	await userEvent.click(
		dialog.getByRole('button', { name: 'Create new Ingestion key' }),
	);
}

/** The form a new key is named and dated in. */
export const CreateKey: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openCreateKey(canvasElement);
	},
};

/** A tag typed on the new key and not confirmed yet. */
export const CreateKeyAddingTag: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const dialog = await openCreateKey(canvasElement);
		await userEvent.click(dialog.getByRole('button', { name: /New Tag/ }));
		await userEvent.keyboard('team-payments');
	},
};

/** The new key with its tags confirmed, each one removable. */
export const CreateKeyTagsAdded: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const dialog = await openCreateKey(canvasElement);
		for (const tag of ['team-payments', 'env:production']) {
			await addTag(dialog, tag);
			await dialog.findByText(tag);
		}
	},
};

/**
 * A tag typed again while the key already has it: Enter keeps the input open
 * and adds nothing, with no message saying why.
 */
export const CreateKeyDuplicateTag: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const dialog = await openCreateKey(canvasElement);
		await addTag(dialog, 'team-payments');
		await addTag(dialog, 'team-payments');
		await dialog.findByDisplayValue('team-payments');
	},
};

/** A tag longer than its pill, cut short with an ellipsis. */
export const CreateKeyLongTag: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const dialog = await openCreateKey(canvasElement);
		const tag =
			'team-payments-platform-observability-production-us-east-1-canary-collectors';
		await addTag(dialog, tag);
		await dialog.findByText(tag);
	},
};

/** A name with a space and no expiration, submitted: each field names its rule. */
export const CreateKeyInvalid: Story = {
	// The page logs the rejected validation through `console.error`.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }): Promise<void> => {
		const dialog = await openCreateKey(canvasElement);
		await userEvent.type(dialog.getByLabelText('Name'), 'otel collectors');
		await userEvent.click(
			dialog.getByRole('button', { name: 'Create new Ingestion key' }),
		);
		await dialog.findByText(/should only contain letters/);
	},
};

/** The expiration calendar, where today and every day before it are disabled. */
export const CreateKeyExpirationOpen: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const dialog = await openCreateKey(canvasElement);
		await userEvent.click(dialog.getByLabelText('Expiration'));
		await screen.findByTitle(dayjs().format('YYYY-MM-DD'));
	},
};

/** The new key sent, with the create still in flight. */
export const CreateKeySubmitting: Story = {
	args: { create: 'hangs' },
	play: async ({ canvasElement }): Promise<void> => {
		const dialog = await openCreateKey(canvasElement);
		await submitCreateKey(dialog);
		await waitFor(() =>
			expect(
				dialog.getByRole('button', { name: 'Create new Ingestion key' }),
			).toBeDisabled(),
		);
	},
};

/**
 * A create the gateway rejects: the notification names the conflict and the
 * form keeps what was typed.
 */
export const CreateKeyFailed: Story = {
	args: { create: 'fails' },
	// The deliberate 409 is the state under test.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }): Promise<void> => {
		const dialog = await openCreateKey(canvasElement);
		await submitCreateKey(dialog);
		await screen.findByText(
			'An ingestion key with this name already exists.',
			undefined,
			untilLoaded,
		);
	},
};
