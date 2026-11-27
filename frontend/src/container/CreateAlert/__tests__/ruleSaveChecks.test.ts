import {
	buildNotificationChannelAttachPermission,
	buildNotificationChannelDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
	buildRuleUpdatePermission,
	RuleAttachPermission,
	RuleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';

import { getRuleCreateChecks, getRuleSaveChecks } from '../ruleSaveChecks';

const ID = 'rule-1';
const UPDATE = buildRuleUpdatePermission(ID);

describe('getRuleCreateChecks', () => {
	it('needs only create without channels', () => {
		expect(getRuleCreateChecks([])).toStrictEqual([RuleCreatePermission]);
	});

	it('attaches the rule and each channel once', () => {
		expect(getRuleCreateChecks(['a', 'b', 'a'])).toStrictEqual([
			RuleCreatePermission,
			RuleAttachPermission,
			buildNotificationChannelAttachPermission('a'),
			buildNotificationChannelAttachPermission('b'),
		]);
	});
});

describe('getRuleSaveChecks', () => {
	it('creates a new rule with its channels', () => {
		expect(
			getRuleSaveChecks({ savedChannelIds: [], selectedChannelIds: ['a'] }),
		).toStrictEqual(getRuleCreateChecks(['a']));
	});

	it('needs only update when the channels are unchanged', () => {
		expect(
			getRuleSaveChecks({
				ruleId: ID,
				savedChannelIds: ['a', 'b'],
				selectedChannelIds: ['b', 'a'],
			}),
		).toStrictEqual([UPDATE]);
	});

	it('attaches added channels and detaches removed ones', () => {
		expect(
			getRuleSaveChecks({
				ruleId: ID,
				savedChannelIds: ['a', 'b'],
				selectedChannelIds: ['b', 'c'],
			}),
		).toStrictEqual([
			UPDATE,
			buildRuleAttachPermission(ID),
			buildNotificationChannelAttachPermission('c'),
			buildRuleDetachPermission(ID),
			buildNotificationChannelDetachPermission('a'),
		]);
	});
});
