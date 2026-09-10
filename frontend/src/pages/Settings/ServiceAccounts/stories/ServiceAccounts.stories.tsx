import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	accountsLoadError,
	keysLoadingForever,
	serviceAccountsMocks,
} from './ServiceAccounts.stories.mocks';

import SettingsPage from '../../Settings';

type ServiceAccountsArgs = PageStoryArgs<typeof serviceAccountsMocks>;

const pageStory = storyMocks(serviceAccountsMocks, { layout: 'app' });

/**
 * Service accounts, the roles they hold and the API keys they carry, with the
 * drawer that creates and revokes keys. Every action is gated on an authz
 * permission.
 *
 * Route: `/settings/service-accounts`.
 */
const meta = {
	title: 'Pages/Settings/Service Accounts',
	tags: ['authz', 'play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ServiceAccountsArgs>;

export default meta;

type Story = StoryObj<ServiceAccountsArgs>;

/** The table fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * The page keeps the drawer, the tab, the modals and the list filters in the
 * query string, so a story reaches any of them by starting there.
 */
const at = (params: string): { signoz: { route: string } } => ({
	signoz: { route: `${ROUTES.SERVICE_ACCOUNTS_SETTINGS}?${params}` },
});

const ACCOUNT = 'service-account-0';
const KEYS_TAB = `account=${ACCOUNT}&tab=keys`;

/**
 * The non-human identities the workspace has issued: what each one is called,
 * whether it is still live, and when it was created.
 */
export const Default: Story = {};

/** A workspace that has not issued one yet. */
export const NoAccounts: Story = {
	args: { accounts: 0, deleted: 0 },
};

/** Enough accounts to paginate, read from the second page. */
export const SecondPage: Story = {
	args: { accounts: 24 },
	parameters: at('page=2'),
};

/** The list narrowed to the accounts that have been deleted. */
export const DeletedOnly: Story = {
	parameters: at('filter=deleted'),
};

/** The list narrowed by a search on the name and email column. */
export const Searched: Story = {
	parameters: at('search=terraform'),
};

/** Interaction: the status menu is open with its active and deleted counts. */
export const FilterMenuOpen: Story = {
	play: async (): Promise<void> => {
		await userEvent.click(
			await screen.findByText(/all accounts/i, undefined, untilLoaded),
		);
		// Every active row carries an ACTIVE badge, so the menu option is matched on
		// its own count suffix.
		await screen.findByText(/^active ⎯/i, undefined, untilLoaded);
	},
};

/** Empty: a search that matches no account keeps the list shell and empty state. */
export const SearchNoResults: Story = {
	parameters: at('search=no-such-service-account'),
};

/** Error: the list request failed while the rest of the settings shell stays usable. */
export const LoadError: Story = {
	parameters: { msw: { handlers: [accountsLoadError] } },
};

/** An account opened up: the name and the roles it acts under. */
export const AccountOverview: Story = {
	parameters: at(`account=${ACCOUNT}`),
};

/**
 * A deleted account, which opens read-only: the name is locked, the keys cannot
 * be touched, and the footer that saves and deletes is gone.
 */
export const DeletedAccount: Story = {
	parameters: at('account=service-account-5'),
};

/**
 * The roles an account can be given. The dropdown opens off the inner combobox,
 * not the wrapper the click lands on first.
 */
export const AssignRoles: Story = {
	parameters: at(`account=${ACCOUNT}`),
	play: async (): Promise<void> => {
		await userEvent.click(
			await screen.findByRole('combobox', undefined, untilLoaded),
		);
		await screen.findByText('oncall-responder', undefined, untilLoaded);
	},
};

/**
 * A rename that comes back a failure: the drawer keeps the edit, names what
 * broke, and offers the retry rather than dropping the change.
 */
export const SaveFailed: Story = {
	args: { saveOutcome: 'fails' },
	parameters: at(`account=${ACCOUNT}`),
	play: async (): Promise<void> => {
		await userEvent.type(
			await screen.findByDisplayValue('ci-pipeline', undefined, untilLoaded),
			'-v2',
		);
		await userEvent.click(await screen.findByText(/save changes/i));
		await screen.findByText(/name update/i, undefined, untilLoaded);
	},
};

/** The dialog a new account is named in. */
export const CreateAccount: Story = {
	parameters: at('create-sa=true'),
};

/** The confirmation an account is deleted behind, keys and all. */
export const DeleteAccount: Story = {
	parameters: at(`account=${ACCOUNT}&delete-sa=true`),
};

/**
 * The keys issued against one account: the one that never expires, the one that
 * has lapsed, and the one nothing has ever called.
 */
export const AccountKeys: Story = {
	parameters: at(KEYS_TAB),
};

/** Loading: account details remain available while only the keys list is pending. */
export const KeysLoading: Story = {
	parameters: { ...at(KEYS_TAB), msw: { handlers: [keysLoadingForever] } },
};

/** An account with nothing issued against it yet. */
export const NoKeys: Story = {
	args: { keys: 0 },
	parameters: at(KEYS_TAB),
};

/**
 * Enough keys to paginate. The drawer resets the page to 1 whenever the account
 * loads, so the second page is reached by clicking rather than by the route.
 * The table carries a second, hidden pagination of its own, so the page number
 * has to be taken from the visible one.
 */
export const KeysSecondPage: Story = {
	args: { keys: 20 },
	parameters: at(KEYS_TAB),
	play: async (): Promise<void> => {
		const pagination = await waitFor(() => {
			const rendered = document.querySelector('.sa-drawer__keys-pagination');
			if (!rendered) {
				throw new Error('the keys pagination has not rendered yet');
			}
			return rendered as HTMLElement;
		}, untilLoaded);

		await userEvent.click(within(pagination).getByTitle('2'));
		await screen.findByText('archive-exporter', undefined, untilLoaded);
	},
};

/** The form a key is named and given an expiry in. */
export const AddKey: Story = {
	parameters: at(`${KEYS_TAB}&add-key=true`),
};

/**
 * What the form turns into once the key exists: the secret in full, which is
 * the only time it is ever shown.
 */
export const KeyCreated: Story = {
	parameters: at(`${KEYS_TAB}&add-key=true`),
	play: async (): Promise<void> => {
		await userEvent.type(
			await screen.findByPlaceholderText(
				/enter key name/i,
				undefined,
				untilLoaded,
			),
			'release-signer',
		);
		await userEvent.click(await screen.findByText(/create key/i));
		await screen.findByText(
			/only time it will be displayed/i,
			undefined,
			untilLoaded,
		);
	},
};

/** One key opened up: what can still be changed about it, and what cannot. */
export const EditKey: Story = {
	parameters: at(`${KEYS_TAB}&edit-key=factor-api-key-0`),
};

/** Interaction: revocation can be reached from the real key-edit dialog. */
export const EditKeyThenRevokeConfirm: Story = {
	parameters: at(`${KEYS_TAB}&edit-key=factor-api-key-0`),
	play: async (): Promise<void> => {
		// The control is rendered disabled until its permission check answers, and a
		// click on a disabled button is dropped without an error.
		const revoke = await waitFor(() => {
			const button = screen.getByRole('button', { name: 'Revoke Key' });

			expect(button).toBeEnabled();

			return button;
		}, untilLoaded);

		await userEvent.click(revoke);
		await screen.findByRole(
			'dialog',
			{ name: /revoke production-writer/i },
			untilLoaded,
		);
	},
};

/** The confirmation a key is revoked behind, straight from its row. */
export const RevokeKey: Story = {
	parameters: at(`${KEYS_TAB}&revoke-key=factor-api-key-0`),
};

/**
 * A viewer, who cannot list service accounts at all and is told so in place of
 * the table.
 */
export const Viewer: Story = {
	args: { access: 'viewer' },
};
