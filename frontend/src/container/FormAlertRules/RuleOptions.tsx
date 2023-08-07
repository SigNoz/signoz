import {
	Form,
	InputNumber,
	InputNumberProps,
	Select,
	SelectProps,
	Space,
	Typography,
} from 'antd';
import { getCategorySelectOptionByName } from 'container/NewWidget/RightContainer/dataFormatCategories';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useTranslation } from 'react-i18next';
import {
	AlertDef,
	defaultCompareOp,
	defaultEvalWindow,
	defaultMatchType,
} from 'types/api/alerts/def';
import { EQueryType } from 'types/common/dashboard';

import { FormContainer, InlineSelect, StepHeading } from './styles';

function RuleOptions({
	alertDef,
	setAlertDef,
	queryCategory,
}: RuleOptionsProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');
	const { currentQuery } = useQueryBuilder();

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

	const renderCompareOps = (): JSX.Element => (
		<InlineSelect
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
			<Select.Option value="3">{t('option_equal')}</Select.Option>
			<Select.Option value="4">{t('option_notequal')}</Select.Option>
		</InlineSelect>
	);

	const renderThresholdMatchOpts = (): JSX.Element => (
		<InlineSelect
			defaultValue={defaultMatchType}
			style={{ minWidth: '130px' }}
			value={alertDef.condition?.matchType}
			onChange={(value: string | unknown): void => handleMatchOptChange(value)}
		>
			<Select.Option value="1">{t('option_atleastonce')}</Select.Option>
			<Select.Option value="2">{t('option_allthetimes')}</Select.Option>
			<Select.Option value="3">{t('option_onaverage')}</Select.Option>
			<Select.Option value="4">{t('option_intotal')}</Select.Option>
		</InlineSelect>
	);

	const renderPromMatchOpts = (): JSX.Element => (
		<InlineSelect
			defaultValue={defaultMatchType}
			style={{ minWidth: '130px' }}
			value={alertDef.condition?.matchType}
			onChange={(value: string | unknown): void => handleMatchOptChange(value)}
		>
			<Select.Option value="1">{t('option_atleastonce')}</Select.Option>
		</InlineSelect>
	);

	const renderEvalWindows = (): JSX.Element => (
		<InlineSelect
			defaultValue={defaultEvalWindow}
			style={{ minWidth: '120px' }}
			value={alertDef.evalWindow}
			onChange={(value: string | unknown): void => {
				const ew = (value as string) || alertDef.evalWindow;
				setAlertDef({
					...alertDef,
					evalWindow: ew,
				});
			}}
		>
			<Select.Option value="5m0s">{t('option_5min')}</Select.Option>
			<Select.Option value="10m0s">{t('option_10min')}</Select.Option>
			<Select.Option value="15m0s">{t('option_15min')}</Select.Option>
			<Select.Option value="1h0m0s">{t('option_60min')}</Select.Option>
			<Select.Option value="4h0m0s">{t('option_4hours')}</Select.Option>
			<Select.Option value="24h0m0s">{t('option_24hours')}</Select.Option>
		</InlineSelect>
	);

	const renderThresholdRuleOpts = (): JSX.Element => (
		<Form.Item>
			<Typography.Text>
				{t('text_condition1')} {renderCompareOps()} {t('text_condition2')}{' '}
				{renderThresholdMatchOpts()} {t('text_condition3')} {renderEvalWindows()}
			</Typography.Text>
		</Form.Item>
	);
	const renderPromRuleOptions = (): JSX.Element => (
		<Form.Item>
			<Typography.Text>
				{t('text_condition1')} {renderCompareOps()} {t('text_condition2')}{' '}
				{renderPromMatchOpts()}
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

	return (
		<>
			<StepHeading>{t('alert_form_step2')}</StepHeading>
			<FormContainer>
				{queryCategory === EQueryType.PROM
					? renderPromRuleOptions()
					: renderThresholdRuleOpts()}

				<Space align="start">
					<Form.Item noStyle name={['condition', 'target']}>
						<InputNumber
							addonBefore={t('field_threshold')}
							value={alertDef?.condition?.target}
							onChange={onChange}
							type="number"
						/>
					</Form.Item>

					<Form.Item>
						<Select
							options={getCategorySelectOptionByName('Data')}
							placeholder={t('field_unit')}
							value={alertDef.condition.targetUnit}
							onChange={onChangeAlertUnit}
							defaultValue={currentQuery?.unit}
						/>
					</Form.Item>
				</Space>
			</FormContainer>
		</>
	);
}

interface RuleOptionsProps {
	alertDef: AlertDef;
	setAlertDef: (a: AlertDef) => void;
	queryCategory: EQueryType;
}
export default RuleOptions;
