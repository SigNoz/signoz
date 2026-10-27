/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTOKind as GridKind,
	DashboardtypesPanelKindDTO as PanelKindDTO,
	DashboardtypesSourceDTO,
	type DashboardtypesGettableDashboardV2DTO,
	type DashboardtypesJSONPatchOperationDTO,
	type GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';

import { applyJsonPatch } from '../../../DashboardContainer/optimistic/applyJsonPatch';

import { PANEL_NAME, PANELS_DASHBOARD_ID, STORY_PANEL_ID } from './constants';
import { panelShape } from './panelPlugins';
import type { PanelArgs } from './types';

export const panelsDashboardResponse = (args: PanelArgs): GetDashboardV2200 => {
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

/**
 * Spec edits travel as a JSON Patch whose response replaces the cache, so the
 * document is kept where the handler can apply the ops. Reseeded on every
 * control change, which is also when the story remounts.
 */
let document: DashboardtypesGettableDashboardV2DTO | undefined;

export const seedPanelsDocument = (args: PanelArgs): void => {
	document = panelsDashboardResponse(args).data;
};

const envelope = (
	data: DashboardtypesGettableDashboardV2DTO,
): GetDashboardV2200 => ({ status: 'success', data });

export const currentPanelsDocument = (args: PanelArgs): GetDashboardV2200 =>
	envelope(document ?? panelsDashboardResponse(args).data);

export const patchPanelsDocument = (
	args: PanelArgs,
	ops: DashboardtypesJSONPatchOperationDTO[],
): GetDashboardV2200 => {
	document = applyJsonPatch(document ?? panelsDashboardResponse(args).data, ops);

	return envelope(document);
};
