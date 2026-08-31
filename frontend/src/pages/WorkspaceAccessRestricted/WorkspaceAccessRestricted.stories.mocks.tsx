/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { LicenseState } from 'types/api/licensesV3/getActive';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import { licenseInState } from '../WorkspaceLocked/__story_mockdata__/workspaceStates';

const LICENSE = 'Workspace · license';

/** The three states that shut the workspace, each with its own sentence. */
const RESTRICTED_STATES = [
	LicenseState.TERMINATED,
	LicenseState.EXPIRED,
	LicenseState.CANCELLED,
] as const;

type RestrictedState = (typeof RESTRICTED_STATES)[number];

export const workspaceAccessRestrictedMocks = defineStoryMocks({
	controls: {
		state: choiceControl<RestrictedState>('License state', {
			group: LICENSE,
			description:
				'Why access was cut, which is the whole difference on the page.',
			options: RESTRICTED_STATES,
			value: LicenseState.TERMINATED,
		}),
	},
	config: (values) => ({
		route: ROUTES.WORKSPACE_ACCESS_RESTRICTED,
		appContext: licenseInState(values.state),
	}),
});
