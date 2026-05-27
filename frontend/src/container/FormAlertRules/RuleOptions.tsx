import { useTranslation } from 'react-i18next';
import {
	Checkbox,
	Collapse,
	Form,
	InputNumber,
	InputNumberProps,
	Space,
} from 'antd';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { SelectSimple, SelectSimpleItem } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import {
	getCategoryByOptionId,
	getCategorySelectOptionByName,
} from 'container/CreateAlertV2/AlertCondition/utils';
import {
	AlertDef,
	defaultAlgorithm,
	defaultCompareOp,
	defaultEvalWindow,
	defaultFrequency,
	defaultMatchType,
	defaultSeasonality,
} from 'types/api/alerts/def';
import { EQueryType } from 'types/common/dashboard';

import { AlertDetectionTypes } from '.';
import { FormContainer, StepHeading, VerticalLine } from './styles';

import './RuleOptions.styles.scss';

function RuleOptions({
	alertDef,
	setAlertDef,
	queryCategory,
	queryOptions,
	yAxisUnit,
}: RuleOptionsProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	const { ruleType } = alertDef;

	const handleMatchOptChange = (value: string | string[]): void => {
		const m = (value as string) || alertDef.condition?.matchType;
		setAlertDef({
			...alertDef,
			condition: {
				...alertDef.condition,
				matchType: m,
			},
		});
	};

	const onChangeSelectedQueryName = (value: string | unknown): void => {
		if (typeof value !== 'string') {
			return;
		}

		setAlertDef({
			...alertDef,
			condition: {
				...alertDef.condition,
				selectedQueryName: value,
			},
		});
	};

	const compareOpItems: SelectSimpleItem[] = [
		{ value: '1', label: t('option_above') },
		{ value: '2', label: t('option_below') },
		...(ruleType !== 'anomaly_rule'
			? [
					{ value: '3', label: t('option_equal') },
					{ value: '4', label: t('option_notequal') },
				]
			: []),
		...(ruleType === 'anomaly_rule'
			? [{ value: '7', label: t('option_above_below') }]
			: []),
	];

	const renderCompareOps = (): JSX.Element => (
		<SelectSimple
			defaultValue={defaultCompareOp}
			value={alertDef.condition?.op}
			items={compareOpItems}
			onChange={(value): void => {
				const newOp = (value as string) || '';

				setAlertDef({
					...alertDef,
					condition: {
						...alertDef.condition,
						op: newOp,
					},
				});
			}}
		/>
	);

	const matchOptItems: SelectSimpleItem[] = [
		{ value: '1', label: t('option_atleastonce') },
		{ value: '2', label: t('option_allthetimes') },
		...(ruleType !== 'anomaly_rule'
			? [
					{ value: '3', label: t('option_onaverage') },
					{ value: '4', label: t('option_intotal') },
					{ value: '5', label: t('option_last') },
				]
			: []),
	];

	const renderMatchOpts = (): JSX.Element => (
		<SelectSimple
			defaultValue={defaultMatchType}
			value={alertDef.condition?.matchType}
			items={matchOptItems}
			onChange={handleMatchOptChange}
		/>
	);

	const onChangeEvalWindow = (value: string | string[]): void => {
		const ew = (value as string) || alertDef.evalWindow;
		setAlertDef({
			...alertDef,
			evalWindow: ew,
		});
	};

	const onChangeAlgorithm = (value: string | string[]): void => {
		const alg = (value as string) || alertDef.condition.algorithm;
		setAlertDef({
			...alertDef,
			condition: {
				...alertDef.condition,
				algorithm: alg,
			},
		});
	};

	const onChangeSeasonality = (value: string | string[]): void => {
		const seasonality = (value as string) || alertDef.condition.seasonality;
		setAlertDef({
			...alertDef,
			condition: {
				...alertDef.condition,
				seasonality,
			},
		});
	};

	const onChangeDeviation = (value: number): void => {
		const target = value || alertDef.condition.target || 3;

		setAlertDef({
			...alertDef,
			condition: { ...alertDef.condition, target: Number(target) },
		});
	};

	const evalWindowItems: SelectSimpleItem[] = [
		{ value: '5m0s', label: t('option_5min') },
		{ value: '10m0s', label: t('option_10min') },
		{ value: '15m0s', label: t('option_15min') },
		{ value: '1h0m0s', label: t('option_60min') },
		{ value: '4h0m0s', label: t('option_4hours') },
		{ value: '24h0m0s', label: t('option_24hours') },
	];

	const renderEvalWindows = (): JSX.Element => (
		<SelectSimple
			defaultValue={defaultEvalWindow}
			value={alertDef.evalWindow}
			items={evalWindowItems}
			onChange={onChangeEvalWindow}
		/>
	);

	const promEvalWindowItems: SelectSimpleItem[] = [
		{ value: '5m0s', label: t('option_5min') },
		{ value: '10m0s', label: t('option_10min') },
		{ value: '15m0s', label: t('option_15min') },
	];

	const renderPromEvalWindows = (): JSX.Element => (
		<SelectSimple
			defaultValue={defaultEvalWindow}
			value={alertDef.evalWindow}
			items={promEvalWindowItems}
			onChange={onChangeEvalWindow}
		/>
	);

	const renderAlgorithms = (): JSX.Element => (
		<SelectSimple
			defaultValue={defaultAlgorithm}
			value={alertDef.condition.algorithm}
			items={[{ value: 'standard', label: 'Standard' }]}
			onChange={onChangeAlgorithm}
		/>
	);

	const deviationItems: SelectSimpleItem[] = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
		value: String(n),
		label: String(n),
	}));

	const renderDeviationOpts = (): JSX.Element => (
		<SelectSimple
			defaultValue="3"
			value={alertDef.condition.target ? String(alertDef.condition.target) : '3'}
			items={deviationItems}
			onChange={(value): void => {
				const n = Number(value);
				if (!Number.isNaN(n)) {
					onChangeDeviation(n);
				}
			}}
		/>
	);

	const seasonalityItems: SelectSimpleItem[] = [
		{ value: 'hourly', label: 'Hourly' },
		{ value: 'daily', label: 'Daily' },
		{ value: 'weekly', label: 'Weekly' },
	];

	const renderSeasonality = (): JSX.Element => (
		<SelectSimple
			defaultValue={defaultSeasonality}
			value={alertDef.condition.seasonality}
			items={seasonalityItems}
			onChange={onChangeSeasonality}
		/>
	);

	const renderThresholdRuleOpts = (): JSX.Element => (
		<Form.Item>
			<Typography.Text>
				{t('text_condition1')}
				<ComboboxSimple
					items={queryOptions}
					placeholder={t('selected_query_placeholder')}
					value={alertDef.condition.selectedQueryName || ''}
					onChange={(value): void => onChangeSelectedQueryName(value as string)}
				/>
				<Typography.Text>is</Typography.Text>
				{renderCompareOps()} {t('text_condition2')} {renderMatchOpts()}{' '}
				{t('text_condition3')} {renderEvalWindows()}
			</Typography.Text>
		</Form.Item>
	);

	const renderPromRuleOptions = (): JSX.Element => (
		<Form.Item>
			<Typography.Text>
				{t('text_condition1')}
				<ComboboxSimple
					items={queryOptions}
					placeholder={t('selected_query_placeholder')}
					value={alertDef.condition.selectedQueryName || ''}
					onChange={(value): void => onChangeSelectedQueryName(value as string)}
				/>
				<Typography.Text>is</Typography.Text>
				{renderCompareOps()} {t('text_condition2')} {renderMatchOpts()}
				{t('text_condition3')} {renderPromEvalWindows()}
			</Typography.Text>
		</Form.Item>
	);

	const onChange: InputNumberProps['onChange'] = (value): void => {
		setAlertDef({
			...alertDef,
			condition: {
				...alertDef.condition,
				op: alertDef.condition?.op || defaultCompareOp,
				matchType: alertDef.condition?.matchType || defaultMatchType,
				target: Number(value) || 0,
			},
		});
	};

	const onChangeAlertUnit = (value: string | string[]): void => {
		setAlertDef({
			...alertDef,
			condition: {
				...alertDef.condition,
				targetUnit: value as string,
			},
		});
	};

	const onChangeFrequency = (value: string | string[]): void => {
		const freq = (value as string) || alertDef.frequency;
		setAlertDef({
			...alertDef,
			frequency: freq,
		});
	};

	const renderAnomalyRuleOpts = (): JSX.Element => (
		<Form.Item>
			<Typography.Text className="rule-definition">
				{t('text_condition1_anomaly')}
				<ComboboxSimple
					items={queryOptions}
					placeholder={t('selected_query_placeholder')}
					value={alertDef.condition.selectedQueryName || ''}
					onChange={(value): void => onChangeSelectedQueryName(value as string)}
				/>
				{t('text_condition3')} {renderEvalWindows()}
				<Typography.Text>is</Typography.Text>
				{renderDeviationOpts()}
				<Typography.Text>deviations</Typography.Text>
				{renderCompareOps()}
				<Typography.Text>the predicted data</Typography.Text>
				{renderMatchOpts()}
				using the {renderAlgorithms()} algorithm with {renderSeasonality()}{' '}
				seasonality
			</Typography.Text>
		</Form.Item>
	);

	const frequencyItems: SelectSimpleItem[] = [
		{ value: '1m0s', label: t('option_1min') },
		{ value: '5m0s', label: t('option_5min') },
		{ value: '10m0s', label: t('option_10min') },
		{ value: '15m0s', label: t('option_15min') },
		{ value: '30m0s', label: t('option_30min') },
		{ value: '1h0m0s', label: t('option_60min') },
		{ value: '3h0m0s', label: t('option_3hours') },
		{ value: '6h0m0s', label: t('option_6hours') },
		{ value: '12h0m0s', label: t('option_12hours') },
		{ value: '24h0m0s', label: t('option_24hours') },
	];

	const renderFrequency = (): JSX.Element => (
		<SelectSimple
			defaultValue={defaultFrequency}
			value={alertDef.frequency}
			items={frequencyItems}
			onChange={onChangeFrequency}
		/>
	);

	const selectedCategory = getCategoryByOptionId(yAxisUnit);

	const categorySelectOptions = getCategorySelectOptionByName(selectedCategory);

	const step3Label = alertDef.alertType === 'METRIC_BASED_ALERT' ? '3' : '2';

	return (
		<>
			<StepHeading>{t('alert_form_step3', { step: step3Label })}</StepHeading>
			<FormContainer className="rule-options-container">
				{queryCategory === EQueryType.PROM && renderPromRuleOptions()}
				{queryCategory !== EQueryType.PROM &&
					ruleType === AlertDetectionTypes.ANOMALY_DETECTION_ALERT && (
						<>{renderAnomalyRuleOpts()}</>
					)}

				{queryCategory !== EQueryType.PROM &&
					ruleType === AlertDetectionTypes.THRESHOLD_ALERT &&
					renderThresholdRuleOpts()}

				<Space direction="vertical" size="large">
					{ruleType !== AlertDetectionTypes.ANOMALY_DETECTION_ALERT && (
						<Space direction="horizontal" align="center">
							<Form.Item noStyle>
								<InputNumber
									addonBefore={t('field_threshold')}
									value={alertDef?.condition?.target}
									onChange={onChange}
									type="number"
									onWheel={(e): void => e.currentTarget.blur()}
								/>
							</Form.Item>

							<Form.Item noStyle>
								<ComboboxSimple
									className="rule-unit-selector"
									items={categorySelectOptions as ComboboxSimpleItem[]}
									placeholder={t('field_unit')}
									value={alertDef.condition.targetUnit || ''}
									onChange={(value): void => onChangeAlertUnit(value as string)}
								/>
							</Form.Item>
						</Space>
					)}

					<Collapse>
						<Collapse.Panel header={t('More options')} key="1">
							<Space direction="vertical" size="large">
								<VerticalLine>
									<Space direction="horizontal" align="center">
										<Typography.Text>{t('text_alert_frequency')}</Typography.Text>
										{renderFrequency()}
									</Space>
								</VerticalLine>

								<VerticalLine>
									<Space direction="horizontal" align="center">
										<Form.Item noStyle name={['condition', 'alertOnAbsent']}>
											<Checkbox
												checked={alertDef?.condition?.alertOnAbsent}
												onChange={(e): void => {
													setAlertDef({
														...alertDef,
														condition: {
															...alertDef.condition,
															alertOnAbsent: e.target.checked,
														},
													});
												}}
											/>
										</Form.Item>
										<Typography.Text>{t('text_alert_on_absent')}</Typography.Text>

										<Form.Item noStyle name={['condition', 'absentFor']}>
											<InputNumber
												min={1}
												value={alertDef?.condition?.absentFor}
												onChange={(value): void => {
													setAlertDef({
														...alertDef,
														condition: {
															...alertDef.condition,
															absentFor: Number(value) || 0,
														},
													});
												}}
												type="number"
												onWheel={(e): void => e.currentTarget.blur()}
											/>
										</Form.Item>
										<Typography.Text>{t('text_for')}</Typography.Text>
									</Space>
								</VerticalLine>

								<VerticalLine>
									<Space direction="horizontal" align="center">
										<Form.Item noStyle name={['condition', 'requireMinPoints']}>
											<Checkbox
												checked={alertDef?.condition?.requireMinPoints}
												onChange={(e): void => {
													setAlertDef({
														...alertDef,
														condition: {
															...alertDef.condition,
															requireMinPoints: e.target.checked,
														},
													});
												}}
											/>
										</Form.Item>
										<Typography.Text>{t('text_require_min_points')}</Typography.Text>

										<Form.Item noStyle name={['condition', 'requiredNumPoints']}>
											<InputNumber
												min={1}
												value={alertDef?.condition?.requiredNumPoints}
												onChange={(value): void => {
													setAlertDef({
														...alertDef,
														condition: {
															...alertDef.condition,
															requiredNumPoints: Number(value) || 0,
														},
													});
												}}
												type="number"
												onWheel={(e): void => e.currentTarget.blur()}
											/>
										</Form.Item>
										<Typography.Text>{t('text_num_points')}</Typography.Text>
									</Space>
								</VerticalLine>
							</Space>
						</Collapse.Panel>
					</Collapse>
				</Space>
			</FormContainer>
		</>
	);
}

interface RuleOptionsProps {
	alertDef: AlertDef;
	setAlertDef: (a: AlertDef) => void;
	queryCategory: EQueryType;
	queryOptions: ComboboxSimpleItem[];
	yAxisUnit: string;
}
export default RuleOptions;
