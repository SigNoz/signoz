import { RULES_DSL_GRAMMAR } from 'container/ListAlertRules/rulesDslGrammar';

import { getSuggestions } from './dslSuggestions';
import type { SuggestionSource } from './types';

const source: SuggestionSource = {
	reservedKeys: [
		'alert_type',
		'created_at',
		'created_by',
		'labels.<key>',
		'name',
		'rule_type',
		'severity',
		'updated_at',
		'updated_by',
	],
	dynamicKeys: ['labels.team', 'labels.env'],
	valuesByKey: { 'labels.team': ['infra'], 'labels.severity': ['critical'] },
	creatorEmails: ['alice@x.io'],
	currentUserEmail: 'me@x.io',
};

const suggest = (q: string): ReturnType<typeof getSuggestions>['items'] =>
	getSuggestions(q, q.length, source, RULES_DSL_GRAMMAR).items;
const labels = (q: string): string[] => suggest(q).map((i) => i.label);

describe('getSuggestions — rules grammar', () => {
	it('orders reserved keys, hides labels.<key> and appends label keys', () => {
		expect(labels('')).toStrictEqual([
			'name',
			'severity',
			'alert_type',
			'rule_type',
			'created_by',
			'updated_by',
			'created_at',
			'updated_at',
			'labels.team',
			'labels.env',
		]);
		expect(suggest('labels.t').map((i) => i.detail)).toStrictEqual(['label']);
	});

	it('restricts enum keys to = != IN NOT IN and suggests their values', () => {
		expect(labels('rule_type ')).toStrictEqual([
			'rule_type =',
			'rule_type !=',
			'rule_type IN',
			'rule_type NOT IN',
		]);
		expect(labels('rule_type = ')).toStrictEqual([
			'threshold_rule',
			'promql_rule',
			'anomaly_rule',
		]);
		expect(labels("alert_type = 'LOGS")).toStrictEqual(['LOGS_BASED_ALERT']);
	});

	it('gives severity and labels.* the label operators and values', () => {
		expect(labels('severity ')).toContain('severity EXISTS');
		expect(labels('severity = ')).toStrictEqual(['critical']);
		expect(labels('labels.team = ')).toStrictEqual(['infra']);
	});

	it('suggests user emails for updated_by', () => {
		expect(labels('updated_by = ')).toStrictEqual(['me@x.io (me)', 'alice@x.io']);
	});
});
