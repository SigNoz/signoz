/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	alertRulesResponse,
	RULE_MAX,
	RULE_STATE_CHOICES,
	SEVERITY_CHOICES,
	type RuleStateChoice,
	type SeverityChoice,
} from '../__story_mockdata__/alerts';
import { AlertListTabs } from '../types';

const LIST = 'Alert rules · list';

export const alertRulesMocks = defineStoryMocks({
	controls: {
		rules: countControl('Alert rules', {
			group: LIST,
			value: 8,
			max: RULE_MAX,
		}),
		ruleSeverity: choiceControl<SeverityChoice>('Severity', {
			group: LIST,
			description:
				'The severity label every rule carries. `mixed` leaves each rule with its own.',
			options: SEVERITY_CHOICES,
			value: 'mixed',
		}),
		ruleState: choiceControl<RuleStateChoice>('State', {
			group: LIST,
			description:
				'The evaluation state the Status column shows. `disabled` also switches the row action to Enable.',
			options: RULE_STATE_CHOICES,
			value: 'mixed',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/rules',
			response.json(() =>
				alertRulesResponse(values.rules, {
					severity: values.ruleSeverity,
					state: values.ruleState,
				}),
			),
		),
	],
	config: () => ({ route: `/alerts?tab=${AlertListTabs.ALERT_RULES}` }),
});
