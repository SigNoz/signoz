import {
	buildPlannedMaintenanceAttachPermission,
	buildPlannedMaintenanceDetachPermission,
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
const EDIT = [buildPlannedMaintenanceUpdatePermission(ID)];
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

		it('needs only create while no rule is picked', () => {
			expect(getDowntimeSaveChecks({ storedAlertIds: [] })).toStrictEqual([
				PlannedMaintenanceCreatePermission,
			]);
		});
	});

	describe('edit', () => {
		it('needs only update while no rule is picked', () => {
			expect(
				getDowntimeSaveChecks({ scheduleId: ID, storedAlertIds: ['a'] }),
			).toStrictEqual(EDIT);
		});

		it('needs only update when the rules are unchanged', () => {
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

		it('needs only update to re-save an all-rules schedule', () => {
			expect(
				getDowntimeSaveChecks({
					scheduleId: ID,
					storedAlertIds: [],
					incomingAlertIds: [],
				}),
			).toStrictEqual(EDIT);
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

		it('attaches every rule and detaches the old ones when widening to all', () => {
			expect(
				getDowntimeSaveChecks({
					scheduleId: ID,
					storedAlertIds: ['a', 'b'],
					incomingAlertIds: [],
				}),
			).toStrictEqual([
				...EDIT,
				ATTACH,
				buildRuleAttachPermission('*'),
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
