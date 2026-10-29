/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	DashboardtypesGettableDashboardV2DTO,
	DashboardtypesJSONPatchOperationDTO,
	GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';

import { applyJsonPatch } from '../../DashboardContainer/optimistic/applyJsonPatch';

export interface DocumentStore<TArgs> {
	seed: (args: TArgs) => void;
	current: (args: TArgs) => GetDashboardV2200;
	patch: (
		args: TArgs,
		ops: DashboardtypesJSONPatchOperationDTO[],
	) => GetDashboardV2200;
}

const envelope = (
	data: DashboardtypesGettableDashboardV2DTO,
): GetDashboardV2200 => ({ status: 'success', data });

/**
 * The document a story is editing. Every spec edit travels as a JSON Patch whose
 * response replaces the cache, so the document is kept where the handler can
 * apply the ops to it. Reseeded whenever a control changes, which is also when
 * the story remounts.
 */
export const documentStore = <TArgs>(
	build: (args: TArgs) => GetDashboardV2200,
): DocumentStore<TArgs> => {
	let document: DashboardtypesGettableDashboardV2DTO | undefined;

	return {
		seed: (args): void => {
			document = build(args).data;
		},
		current: (args): GetDashboardV2200 => envelope(document ?? build(args).data),
		patch: (args, ops): GetDashboardV2200 => {
			document = applyJsonPatch(document ?? build(args).data, ops);

			return envelope(document);
		},
	};
};
