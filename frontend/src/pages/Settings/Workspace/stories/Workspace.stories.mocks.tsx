/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import { buildLicenseReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/license.permissions';
import { rest } from 'msw';
import type { TStatus } from 'types/api/settings/getRetention';
import { USER_ROLES } from 'types/roles';

import { accessFor, grantsAll } from '@/storybook/access/access';
import { choiceControl, toggleControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	isCloudShell,
	shellFeatureActive,
	shellLicense,
} from '@/storybook/globals/appShellMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	disksResponse,
	hostsResponse,
	logsRetentionResponse,
	metricsRetentionResponse,
	RETENTION_STATUSES,
	tracesRetentionResponse,
	DOMAIN_UPDATES,
	WORKSPACE_URLS,
	type DomainUpdate,
	type WorkspaceUrl,
} from './__story_mockdata__/workspace';

const RETENTION = 'Workspace · retention';
const DOMAIN = 'Workspace · domain';

export const workspaceMocks = defineStoryMocks({
	controls: {
		coldStorage: toggleControl('Cold storage', {
			group: RETENTION,
			description:
				'Whether the instance reports an s3 disk. Without one the "Move to S3" field is hidden on all three signals.',
			value: true,
		}),
		retentionStatus: choiceControl<TStatus>('Retention change', {
			group: RETENTION,
			description:
				'State of the last retention change. Anything other than the empty value adds the status row and, while pending, blocks the save button. Self-hosted only: cloud has no retention controls to report on, so nothing moves while License is `cloud`.',
			options: RETENTION_STATUSES,
			value: '',
		}),
		workspaceUrl: choiceControl<WorkspaceUrl>('Workspace URL', {
			group: DOMAIN,
			description:
				'Whether a custom subdomain is set. Cloud admins only: self-hosted has no domain card.',
			options: WORKSPACE_URLS,
			value: 'custom',
		}),
		domainUpdate: choiceControl<DomainUpdate>('Domain update', {
			group: DOMAIN,
			description:
				'How the PUT behind "Apply Changes" answers. `success` raises the "Workspace URL updated" toast, `loading` never answers and leaves the button spinning, `error` shows the failure in the modal.',
			options: DOMAIN_UPDATES,
			value: 'success',
		}),
	},
	handlers: (values, response) => [
		// One path, two signals: the type the page asks for is a query param.
		rest.get(
			'http://localhost/api/v1/settings/ttl',
			response.json((req) =>
				req.url.searchParams.get('type') === 'traces'
					? tracesRetentionResponse(values.retentionStatus, values.coldStorage)
					: metricsRetentionResponse(values.retentionStatus, values.coldStorage),
			),
		),

		rest.get(
			'http://localhost/api/v2/settings/ttl',
			response.json(() =>
				logsRetentionResponse(values.retentionStatus, values.coldStorage),
			),
		),

		rest.get(
			'http://localhost/api/v1/disks',
			response.json(() => disksResponse(values.coldStorage)),
		),

		// The domain card is the shell of the page rather than its data, so it keeps
		// answering while the retention endpoints hang or fail.
		rest.get('http://localhost/api/v2/zeus/hosts', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(hostsResponse(values.workspaceUrl))),
		),

		rest.put('http://localhost/api/v2/zeus/hosts', (_req, res, ctx) => {
			if (values.domainUpdate === 'loading') {
				return res(ctx.delay('infinite'));
			}

			return values.domainUpdate === 'error'
				? res(
						ctx.status(409),
						ctx.json({
							status: 'error',
							error: { code: 'already_exists', message: 'Subdomain is taken' },
						}),
					)
				: res(ctx.status(204));
		}),

		rest.post('http://localhost/api/v1/subscriptions', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ data: { redirectURL: '' } })),
		),
	],
	config: () => ({ route: ROUTES.SETTINGS }),
});

export type WorkspaceArgs = PageStoryArgs<typeof workspaceMocks>;

/** The domain card only renders for an admin on cloud. */
export const showsDomainCard = (args: WorkspaceArgs): boolean =>
	isCloudShell(args) &&
	accessFor(args.access, args.permissions, args.revoked).legacyRole ===
		USER_ROLES.ADMIN;

/** Contact Support, which the edit modal offers after a 409, needs the chat support flag. */
export const offersContactSupport = (args: WorkspaceArgs): boolean =>
	showsDomainCard(args) && shellFeatureActive(args, FeatureKeys.CHAT_SUPPORT);

/** Only a plan without premium support is offered the modal over the chat widget. */
export const offersAddCard = (args: WorkspaceArgs): boolean =>
	offersContactSupport(args) &&
	!shellFeatureActive(args, FeatureKeys.PREMIUM_SUPPORT);

/** The key is fetched once `authz/check` has granted the read on the active license. */
export const showsLicenseKey = (args: WorkspaceArgs): boolean => {
	const license = shellLicense(args);

	return !!license && grantsAll(args, buildLicenseReadPermission(license.id));
};
