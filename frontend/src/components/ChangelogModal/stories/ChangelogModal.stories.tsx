import type { Meta, StoryObj } from '@storybook/react-vite';
import { createAppContextMock } from 'tests/fixtures/appContextMock';
import { LicensePlatform } from 'types/api/licensesV3/getActive';
import { USER_ROLES } from 'types/roles';
import { fn } from 'storybook/test';

import { storyChangelog } from './__story_mockdata__/changelog';
import {
	showsCloudChangelog,
	showsSelfHostedChangelog,
} from './__story_mockdata__/changelogModal.play';

import ChangelogModal from '../ChangelogModal';

const { activeLicense } = createAppContextMock(USER_ROLES.ADMIN);

/** `AppLayout` opens it one second after load, for a version the user has not seen. */
const meta = {
	title: 'Components/Changelog Modal',
	component: ChangelogModal,
	tags: ['play'],
	parameters: { signoz: {} },
	args: {
		changelog: storyChangelog,
		onClose: fn(),
	},
} satisfies Meta<typeof ChangelogModal>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Cloud workspaces update on their own, so the footer has no update actions. */
export const Cloud: Story = {
	play: showsCloudChangelog,
};

/** Self-hosted workspaces get "Skip for now" and "Update my workspace". */
export const SelfHosted: Story = {
	parameters: {
		signoz: {
			appContext: {
				activeLicense: activeLicense && {
					...activeLicense,
					platform: LicensePlatform.SELF_HOSTED,
				},
			},
		},
	},
	play: showsSelfHostedChangelog,
};
