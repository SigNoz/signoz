import './RuleOptions.styles.scss';

import {
	Checkbox,
	Collapse,
	Form,
	InputNumber,
	InputNumberProps,
	Select,
	SelectProps,
	Space,
	Typography,
} from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import {
	getCategoryByOptionId,
	getCategorySelectOptionByName,
} from 'container/NewWidget/RightContainer/alertFomatCategories';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useTranslation } from 'react-i18next';
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
import { popupContainer } from 'utils/selectPopupContainer';

import { AlertDetectionTypes } from '.';
import {
	FormContainer,
	InlineSelect,
	StepHeading,
	VerticalLine,
} from './styles';

function RuleOptions({
	alertDef,
	setAlertDef,
	queryCategory,
	queryOptions,
}: RuleOptionsProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');
	const { currentQuery } = useQueryBuilder();

	const { ruleType } = alertDef;

	const handleMatchOptChange = (value: string | unknown): void => {
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
		if (typeof value !== 'string') return;

		setAlertDef({
			...alertDef,
			condition: {
				...alertDef.condition,
				selectedQueryName: value,
			},
		});
	};

	const renderCompareOps = (): JSX.Element => (
		<InlineSelect
			getPopupContainer={popupContainer}
			defaultValue={defaultCompareOp}
			value={alertDef.condition?.op}
			style={{ minWidth: '120px' }}
			onChange={(value: string | unknown): void => {
				const newOp = (value as string) || '';

				setAlertDef({
					...alertDef,
					condition: {
						...alertDef.condition,
						op: newOp,
					},
				});
			}}
		>
			<Select.Option value="1">{t('option_above')}</Select.Option>
			<Select.Option value="2">{t('option_below')}</Select.Option>

			{/* hide equal and not eqaul in case of analmoy based alert */}

			{ruleType !== 'anomaly_rule' && (
				<>
					<Select.Option value="3">{t('option_equal')}</Select.Option>
					<Select.Option value="4">{t('option_notequal')}</Select.Option>
				</>
			)}
			{/* the value 5 and 6 are reserved for above or equal and below or equal */}
			{ruleType === 'anomaly_rule' && (
				<Select.Option value="7">{t('option_above_below')}</Select.Option>
			)}
		</InlineSelect>
	);

	const renderMatchOpts = (): JSX.Element => (
		<InlineSelect
			getPopupContainer={popupContainer}
			defaultValue={defaultMatchType}
			style={{ minWidth: '130px' }}
			value={alertDef.condition?.matchType}
			onChange={(value: string | unknown): void => handleMatchOptChange(value)}
		>
			<Select.Option value="1">{t('option_atleastonce')}</Select.Option>
			<Select.Option value="2">{t('option_allthetimes')}</Select.Option>

			{ruleType !== 'anomaly_rule' && (
				<>
					<Select.Option value="3">{t('option_onaverage')}</Select.Option>
					<Select.Option value="4">{t('option_intotal')}</Select.Option>
					<Select.Option value="5">{t('option_last')}</Select.Option>
				</>
			)}
		</InlineSelect>
	);

	const onChangeEvalWindow = (value: string | unknown): void => {
		const ew = (value as string) || alertDef.evalWindow;
		setAlertDef({
			...alertDef,
			evalWindow: ew,
		});
	};

	const onChangeAlgorithm = (value: string | unknown): void => {
		const alg = (value as string) || alertDef.condition.algorithm;
		setAlertDef({
			...alertDef,
			condition: {
				...alertDef.condition,
				algorithm: alg,
			},
		});
	};

	const onChangeSeasonality = (value: string | unknown): void => {
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

	const renderEvalWindows = (): JSX.Element => (
		<InlineSelect
			getPopupContainer={popupContainer}
			defaultValue={defaultEvalWindow}
			style={{ minWidth: '120px' }}
			value={alertDef.evalWindow}
			onChange={onChangeEvalWindow}
		>
			<Select.Option value="5m0s">{t('option_5min')}</Select.Option>
			<Select.Option value="10m0s">{t('option_10min')}</Select.Option>
			<Select.Option value="15m0s">{t('option_15min')}</Select.Option>
			<Select.Option value="1h0m0s">{t('option_60min')}</Select.Option>
			<Select.Option value="4h0m0s">{t('option_4hours')}</Select.Option>
			<Select.Option value="24h0m0s">{t('option_24hours')}</Select.Option>
		</InlineSelect>
	);

	const renderPromEvalWindows = (): JSX.Element => (
		<InlineSelect
			getPopupContainer={popupContainer}
			defaultValue={defaultEvalWindow}
			style={{ minWidth: '120px' }}
			value={alertDef.evalWindow}
			onChange={onChangeEvalWindow}
		>
			<Select.Option value="5m0s">{t('option_5min')}</Select.Option>
			<Select.Option value="10m0s">{t('option_10min')}</Select.Option>
			<Select.Option value="15m0s">{t('option_15min')}</Select.Option>
		</InlineSelect>
	);

	const renderAlgorithms = (): JSX.Element => (
		<InlineSelect
			getPopupContainer={popupContainer}
			defaultValue={defaultAlgorithm}
			style={{ minWidth: '120px' }}
			value={alertDef.condition.algorithm}
			onChange={onChangeAlgorithm}
		>
			<Select.Option value="standard">Standard</Select.Option>
		</InlineSelect>
	);

	const renderDeviationOpts = (): JSX.Element => (
		<InlineSelect
			getPopupContainer={popupContainer}
			defaultValue={3}
			style={{ minWidth: '120px' }}
			value={alertDef.condition.target}
			onChange={(value: number | unknown): void => {
				if (typeof value === 'number') {
					onChangeDeviation(value);
				}
			}}
		>
			<Select.Option value={1}>1</Select.Option>
			<Select.Option value={2}>2</Select.Option>
			<Select.Option value={3}>3</Select.Option>
			<Select.Option value={4}>4</Select.Option>
			<Select.Option value={5}>5</Select.Option>
			<Select.Option value={6}>6</Select.Option>
			<Select.Option value={7}>7</Select.Option>
		</InlineSelect>
	);

	const renderSeasonality = (): JSX.Element => (
		<InlineSelect
			getPopupContainer={popupContainer}
			defaultValue={defaultSeasonality}
			style={{ minWidth: '120px' }}
			value={alertDef.condition.seasonality}
			onChange={onChangeSeasonality}
		>
			<Select.Option value="hourly">Hourly</Select.Option>
			<Select.Option value="daily">Daily</Select.Option>
			<Select.Option value="weekly">Weekly</Select.Option>
		</InlineSelect>
	);

	const renderThresholdRuleOpts = (): JSX.Element => (
		<Form.Item>
			<Typography.Text>
				{t('text_condition1')}
				<InlineSelect
					getPopupContainer={popupContainer}
					allowClear
					showSearch
					options={queryOptions}
					placeholder={t('selected_query_placeholder')}
					value={alertDef.condition.selectedQueryName}
					onChange={onChangeSelectedQueryName}
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
				<InlineSelect
					getPopupContainer={popupContainer}
					allowClear
					showSearch
					options={queryOptions}
					placeholder={t('selected_query_placeholder')}
					value={alertDef.condition.selectedQueryName}
					onChange={onChangeSelectedQueryName}
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

	const onChangeAlertUnit: SelectProps['onChange'] = (value) => {
		setAlertDef({
			...alertDef,
			condition: {
				...alertDef.condition,
				targetUnit: value as string,
			},
		});
	};

	const onChangeFrequency = (value: string | unknown): void => {
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
				<InlineSelect
					getPopupContainer={popupContainer}
					allowClear
					showSearch
					options={queryOptions}
					placeholder={t('selected_query_placeholder')}
					value={alertDef.condition.selectedQueryName}
					onChange={onChangeSelectedQueryName}
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

	const renderFrequency = (): JSX.Element => (
		<InlineSelect
			getPopupContainer={popupContainer}
			defaultValue={defaultFrequency}
			style={{ minWidth: '120px' }}
			value={alertDef.frequency}
			onChange={onChangeFrequency}
		>
			<Select.Option value="1m0s">{t('option_1min')}</Select.Option>
			<Select.Option value="5m0s">{t('option_5min')}</Select.Option>
			<Select.Option value="10m0s">{t('option_10min')}</Select.Option>
			<Select.Option value="15m0s">{t('option_15min')}</Select.Option>
			<Select.Option value="30m0s">{t('option_30min')}</Select.Option>
			<Select.Option value="1h0m0s">{t('option_60min')}</Select.Option>
			<Select.Option value="3h0m0s">{t('option_3hours')}</Select.Option>
			<Select.Option value="6h0m0s">{t('option_6hours')}</Select.Option>
			<Select.Option value="12h0m0s">{t('option_12hours')}</Select.Option>
			<Select.Option value="24h0m0s">{t('option_24hours')}</Select.Option>
		</InlineSelect>
	);

	const selectedCategory = getCategoryByOptionId(currentQuery?.unit || '');

	const categorySelectOptions = getCategorySelectOptionByName(
		selectedCategory?.name,
	);

	return (
		<>
			<StepHeading>{t('alert_form_step3')}</StepHeading>
			<FormContainer>
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
							<Form.Item noStyle name={['condition', 'target']}>
								<InputNumber
									addonBefore={t('field_threshold')}
									value={alertDef?.condition?.target}
									onChange={onChange}
									type="number"
									onWheel={(e): void => e.currentTarget.blur()}
								/>
							</Form.Item>

							<Form.Item noStyle>
								<Select
									getPopupContainer={popupContainer}
									allowClear
									showSearch
									options={categorySelectOptions}
									placeholder={t('field_unit')}
									value={alertDef.condition.targetUnit}
									onChange={onChangeAlertUnit}
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
	queryOptions: DefaultOptionType[];
}
export default RuleOptions;
