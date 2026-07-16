import type {
	DashboardtypesJSONPatchOperationDTO,
	DashboardtypesVariableDTO,
} from 'api/generated/services/sigNoz.schemas';

/**
 * Builds the JSON-Patch to persist the dashboard's variable list. Add/edit/
 * delete/reorder all replace the whole `/spec/variables` array in one atomic op
 * — simpler and race-free vs per-index patches. RFC-6902 `add` on an object
 * member sets-or-replaces, so it works whether or not `variables` already exists.
 */
export function buildVariablesPatch(
	variables: DashboardtypesVariableDTO[],
): DashboardtypesJSONPatchOperationDTO[] {
	return [
		{
			op: 'add' as DashboardtypesJSONPatchOperationDTO['op'],
			path: '/spec/variables',
			value: variables,
		},
	];
}
