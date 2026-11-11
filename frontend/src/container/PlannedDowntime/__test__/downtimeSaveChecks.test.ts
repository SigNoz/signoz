import {
	buildPlannedMaintenanceAttachPermission,
	buildPlannedMaintenanceDetachPermission,
	buildPlannedMaintenanceReadPermission,
	buildPlannedMaintenanceUpdatePermission,
	PlannedMaintenanceAttachPermission,
	PlannedMaintenanceCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/planned-maintenance.permissions';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';

import { getDowntimeSaveChecks } from '../downtimeSaveChecks';

const ID = 'schedule-1';
const EDIT = [
	buildPlannedMaintenanceReadPermission(ID),
	buildPlannedMaintenanceUpdatePermission(ID),
];
const ATTACH = buildPlannedMaintenanceAttachPermission(ID);
const DETACH = buildPlannedMaintenanceDetachPermission(ID);

describe('getDowntimeSaveChecks', () => {
	describe('create', () => {
		it('links each picked rule', () => {
			expect(
				getDowntimeSaveChecks({
					storedAlertIds: [],
					incomingAlertIds: ['a', 'b'],
				}),
			).toStrictEqual([
				PlannedMaintenanceCreatePermission,
				PlannedMaintenanceAttachPermission,
				buildRuleAttachPermission('a'),
				buildRuleAttachPermission('b'),
			]);
		});

		it('links every rule when none are picked', () => {
			expect(
				getDowntimeSaveChecks({ storedAlertIds: [], incomingAlertIds: [] }),
			).toStrictEqual([
				PlannedMaintenanceCreatePermission,
				PlannedMaintenanceAttachPermission,
				buildRuleAttachPermission('*'),
			]);
		});
	});

	describe('edit', () => {
		it('needs only read and update when the rules are unchanged', () => {
			expect(
				getDowntimeSaveChecks({
					scheduleId: ID,
					storedAlertIds: ['a'],
					incomingAlertIds: ['a'],
				}),
			).toStrictEqual(EDIT);
		});

		it('attaches added rules and detaches removed ones', () => {
			expect(
				getDowntimeSaveChecks({
					scheduleId: ID,
					storedAlertIds: ['a', 'b'],
					incomingAlertIds: ['b', 'c'],
				}),
			).toStrictEqual([
				...EDIT,
				ATTACH,
				buildRuleAttachPermission('c'),
				DETACH,
				buildRuleDetachPermission('a'),
			]);
		});

		it('detaches every rule when an all-rules schedule is re-saved', () => {
			expect(
				getDowntimeSaveChecks({
					scheduleId: ID,
					storedAlertIds: [],
					incomingAlertIds: [],
				}),
			).toStrictEqual([...EDIT, DETACH, buildRuleDetachPermission('*')]);
		});

		it('detaches every rule and attaches the picks when narrowing from all', () => {
			expect(
				getDowntimeSaveChecks({
					scheduleId: ID,
					storedAlertIds: [],
					incomingAlertIds: ['a'],
				}),
			).toStrictEqual([
				...EDIT,
				ATTACH,
				buildRuleAttachPermission('a'),
				DETACH,
				buildRuleDetachPermission('*'),
			]);
		});

		it('only detaches the old rules when widening to all', () => {
			expect(
				getDowntimeSaveChecks({
					scheduleId: ID,
					storedAlertIds: ['a', 'b'],
					incomingAlertIds: [],
				}),
			).toStrictEqual([
				...EDIT,
				DETACH,
				buildRuleDetachPermission('a'),
				buildRuleDetachPermission('b'),
			]);
		});

		it('counts a repeated rule once', () => {
			expect(
				getDowntimeSaveChecks({
					scheduleId: ID,
					storedAlertIds: [],
					incomingAlertIds: ['a', 'a'],
				}),
			).toStrictEqual([
				...EDIT,
				ATTACH,
				buildRuleAttachPermission('a'),
				DETACH,
				buildRuleDetachPermission('*'),
			]);
		});
	});
});
