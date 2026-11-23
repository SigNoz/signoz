/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTOKind as GridKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTOKind';
import { DashboardtypesPanelKindDTO as PanelKindDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelKindDTO';
import { DashboardtypesSourceDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesSourceDTO';
import type { GetDashboardV2200 } from 'api/generated/services/sigNoz.schemas/getDashboardV2200';

import { documentStore } from '../../__story_mockdata__/documentStore';

import { PANEL_NAME, PANELS_DASHBOARD_ID, STORY_PANEL_ID } from './constants';
import { panelShape } from './panelPlugins';
import type { PanelArgs } from './types';

const panelsDashboardResponse = (args: PanelArgs): GetDashboardV2200 => {
	const { plugin, queries } = panelShape(args);

	return {
		status: 'success',
		data: {
			id: PANELS_DASHBOARD_ID,
			orgId: 'storybook-org',
			name: 'Panel gallery',
			image: '/assets/Icons/circus-tent',
			schemaVersion: 'v6',
			source: DashboardtypesSourceDTO.user,
			locked: false,
			createdBy: 'ada@signoz.io',
			updatedBy: 'ada@signoz.io',
			createdAt: '2026-05-04T09:12:00Z',
			updatedAt: '2026-08-21T16:40:00Z',
			tags: [],
			spec: {
				display: { name: 'Panel gallery' },
				layouts: [
					{
						kind: GridKind.Grid,
						spec: {
							items: [
								{
									x: 0,
									y: 0,
									width: 12,
									height: 8,
									content: { $ref: `#/spec/panels/${STORY_PANEL_ID}` },
								},
							],
						},
					},
				],
				panels: {
					[STORY_PANEL_ID]: {
						kind: PanelKindDTO.Panel,
						spec: { display: { name: PANEL_NAME[args.kind] }, plugin, queries },
					},
				},
				variables: [],
			},
		},
	};
};

const store = documentStore(panelsDashboardResponse);

export const seedPanelsDocument = store.seed;

export const currentPanelsDocument = store.current;

export const patchPanelsDocument = store.patch;
