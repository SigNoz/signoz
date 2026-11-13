/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import { QueryParams } from 'constants/query';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import { choiceControl, toggleControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import { fieldValuesResponse } from '@/storybook/msw/__story_mockdata__/fields';

import {
	apdexSettingsResponse,
	ENVIRONMENTS,
	isServiceDashboardName,
	SERVICE_DETAILS_TABS,
	SERVICE_NAME,
	SERVICE_NAMES,
	serviceQueryRangeResponse,
	serviceSystemDashboardResponse,
	type ServiceDetailsTabKey,
} from './__story_mockdata__/serviceDetails';

const VIEW = 'Service · view';
const DATA = 'Service · data';

const APDEX_THRESHOLD = 0.5;

const dashboardForbidden: Parameters<typeof rest.get>[1] = (_req, res, ctx) =>
	res(
		ctx.status(403),
		ctx.json({
			status: 'error',
			error: { code: 'forbidden', message: 'forbidden' },
		}),
	);

export const serviceDetailsMocks = defineStoryMocks({
	controls: {
		tab: choiceControl<ServiceDetailsTabKey>('Tab', {
			group: VIEW,
			description: 'Which of the service tabs is open, which is the `tab` param.',
			options: SERVICE_DETAILS_TABS,
			value: 'OVER_METRICS',
		}),
		dashboardAccess: toggleControl('Dashboard read access', {
			group: VIEW,
			description:
				'Whether the viewer may read the tab’s system dashboard. Without it the system dashboard answers 403 and the tab names the missing permission.',
			value: true,
		}),
		noData: toggleControl('No traffic', {
			group: DATA,
			description: 'Every panel query answers with no series or rows.',
			value: false,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/dashboards/system/:name',
			values.dashboardAccess
				? response.json((req) => {
						const name = String(req.params.name);
						return serviceSystemDashboardResponse(
							isServiceDashboardName(name) ? name : 'services-overview',
						);
					})
				: dashboardForbidden,
		),
		rest.post(
			'http://localhost/api/v5/query_range',
			response.json(async (req) =>
				serviceQueryRangeResponse((await req.json()) as QueryRangeRequestV5, {
					noData: values.noData,
				}),
			),
		),
		rest.get(
			'http://localhost/api/v1/fields/values',
			response.json((req) =>
				fieldValuesResponse(
					req.url.searchParams.get('name') === 'deployment.environment'
						? ENVIRONMENTS
						: SERVICE_NAMES,
				),
			),
		),
		// The page holds the tabs until the threshold answers, so it stays up through the data states.
		rest.get('http://localhost/api/v1/settings/apdex', (req, res, ctx) =>
			res(
				ctx.json(
					apdexSettingsResponse(
						req.url.searchParams.get('services') ?? SERVICE_NAME,
						APDEX_THRESHOLD,
					),
				),
			),
		),
		rest.post('http://localhost/api/v1/settings/apdex', (_req, res, ctx) =>
			res(ctx.json({ status: 'success', data: 'ok' })),
		),
	],
	config: (values) => ({
		route: `/services/${SERVICE_NAME}?${QueryParams.tab}=${values.tab}`,
	}),
});
