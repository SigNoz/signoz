import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	copyKeySecret,
	createAccount,
	createKey,
	deleteAccount,
	failAccountSave,
	openAssignRoles,
	openFilterMenu,
	openKeyRevokeFromEdit,
	openKeysSecondPage,
	revokeKeyFromEdit,
	revokeKeyFromRow,
	saveAccountName,
	saveKeyName,
} from './__story_mockdata__/serviceAccounts.play';
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
	play: openFilterMenu,
};

/** Empty: a search that matches no account keeps the list shell and empty state. */
export const SearchNoResults: Story = {
	parameters: at('search=no-such-service-account'),
};

/** Error: the list request failed while the rest of the settings shell stays usable. */
export const LoadError: Story = {
	// The deliberate 500 is the state under test.
	parameters: {
		msw: { handlers: [accountsLoadError] },
		allowConsoleErrors: true,
	},
};

/** An account opened up: the name and the roles it acts under. */
export const AccountOverview: Story = {
	// The deliberate 500 is the state under test.
	parameters: { ...at(`account=${ACCOUNT}`), allowConsoleErrors: true },
};

/**
 * A deleted account, which opens read-only: the name is locked, the keys cannot
 * be touched, and the footer that saves and deletes is gone.
 */
export const DeletedAccount: Story = {
	parameters: at('account=service-account-5'),
};

/** The roles an account can be given. */
export const AssignRoles: Story = {
	parameters: at(`account=${ACCOUNT}`),
	play: openAssignRoles,
};

/**
 * A rename that comes back a failure: the drawer keeps the edit, names what
 * broke, and offers the retry rather than dropping the change.
 */
export const SaveFailed: Story = {
	args: { saveOutcome: 'fails' },
	// The deliberate 500 is the state under test.
	parameters: { ...at(`account=${ACCOUNT}`), allowConsoleErrors: true },
	play: failAccountSave,
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
	play: openKeysSecondPage,
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
	play: createKey,
};

/** One key opened up: what can still be changed about it, and what cannot. */
export const EditKey: Story = {
	parameters: at(`${KEYS_TAB}&edit-key=factor-api-key-0`),
};

/** Interaction: revocation can be reached from the real key-edit dialog. */
export const EditKeyThenRevokeConfirm: Story = {
	parameters: at(`${KEYS_TAB}&edit-key=factor-api-key-0`),
	play: openKeyRevokeFromEdit,
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

/**
 * A rename saved: the toast confirming it. Set Saving the account to `fails` to
 * see the drawer keep the edit instead.
 */
export const AccountUpdatedToast: Story = {
	parameters: at(`account=${ACCOUNT}`),
	play: saveAccountName,
};

/**
 * A new account created: the toast confirming it. Set Creating an account to
 * `error` or `loading` to see the dialog instead.
 */
export const AccountCreatedToast: Story = {
	parameters: at('create-sa=true'),
	play: createAccount,
};

/**
 * An account deleted from its confirmation: the toast confirming it. Set
 * Deleting an account to `error` or `loading` to see the dialog instead.
 */
export const AccountDeletedToast: Story = {
	parameters: at(`account=${ACCOUNT}&delete-sa=true`),
	play: deleteAccount,
};

/**
 * A key renamed in its dialog: the toast confirming it. Set Updating a key to
 * `error` or `loading` to see the dialog instead.
 */
export const KeyUpdatedToast: Story = {
	parameters: at(`${KEYS_TAB}&edit-key=factor-api-key-0`),
	play: saveKeyName,
};

/**
 * A key revoked from its edit dialog: the toast confirming it. Set Revoking a
 * key to `error` or `loading` to see the confirmation instead.
 */
export const KeyRevokedFromEditToast: Story = {
	parameters: at(`${KEYS_TAB}&edit-key=factor-api-key-0`),
	play: revokeKeyFromEdit,
};

/**
 * A key revoked from its row's confirmation: the toast confirming it. Set
 * Revoking a key to `error` or `loading` to see the confirmation instead.
 */
export const KeyRevokedToast: Story = {
	parameters: at(`${KEYS_TAB}&revoke-key=factor-api-key-0`),
	play: revokeKeyFromRow,
};

/** The new key's secret copied from the creation dialog: the toast confirming it. */
export const KeyCopiedToast: Story = {
	parameters: at(`${KEYS_TAB}&add-key=true`),
	play: copyKeySecret,
};
