import {
	RuletypesAlertStateDTO,
	RuletypesAlertTypeDTO,
	RuletypesPanelTypeDTO,
	RuletypesQueryTypeDTO,
	RuletypesRuleTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import type {
	RuletypesRuleConditionDTO,
	RuletypesRuleDTO,
} from 'api/generated/services/sigNoz.schemas';

const baseCondition: RuletypesRuleConditionDTO = {
	compositeQuery: {
		queryType: RuletypesQueryTypeDTO.builder,
		panelType: RuletypesPanelTypeDTO.graph,
		queries: null,
	},
} as unknown as RuletypesRuleConditionDTO;

const make = (
	id: string,
	overrides: Partial<RuletypesRuleDTO>,
): RuletypesRuleDTO => ({
	id,
	alert: `Alert ${id}`,
	alertType: RuletypesAlertTypeDTO.METRIC_BASED_ALERT,
	condition: baseCondition,
	createdAt: '2023-10-15T10:00:00Z',
	updatedAt: '2023-10-19T10:00:00Z',
	createdBy: 'alice@signoz.io',
	updatedBy: 'alice@signoz.io',
	disabled: false,
	state: RuletypesAlertStateDTO.inactive,
	labels: { severity: 'info' },
	annotations: {},
	source: '',
	evalWindow: '5m0s',
	frequency: '1m0s',
	ruleType: RuletypesRuleTypeDTO.threshold_rule,
	...overrides,
});

export const alertRulesFixture: RuletypesRuleDTO[] = [
	make('rule-1', {
		alert: 'High CPU Alert',
		state: RuletypesAlertStateDTO.firing,
		labels: { severity: 'critical', team: 'infra' },
	}),
	make('rule-2', {
		alert: 'Memory Pending Alert',
		state: RuletypesAlertStateDTO.pending,
		labels: { severity: 'warning', team: 'backend' },
	}),
	make('rule-3', {
		alert: 'Healthy Alert',
		state: RuletypesAlertStateDTO.inactive,
		labels: { severity: 'info', team: 'infra' },
	}),
	make('rule-4', {
		alert: 'Disabled Alert',
		state: RuletypesAlertStateDTO.disabled,
		disabled: true,
		labels: { severity: 'critical', team: 'frontend' },
	}),
	make('rule-5', {
		alert: 'No Labels Alert',
		state: RuletypesAlertStateDTO.inactive,
		labels: {},
	}),
];

export const alertRulesPaginationFixture: RuletypesRuleDTO[] = Array.from(
	{ length: 15 },
	(_, i) =>
		make(`rule-pag-${i}`, {
			alert: `Pag Rule ${i}`,
			state:
				i % 2 === 0
					? RuletypesAlertStateDTO.firing
					: RuletypesAlertStateDTO.inactive,
			labels: { severity: i % 2 === 0 ? 'critical' : 'warning' },
			createdAt: `2023-10-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
		}),
);
