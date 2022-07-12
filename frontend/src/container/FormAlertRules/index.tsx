import { ExclamationCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { FormInstance, Modal, notification, Typography } from 'antd';
import saveAlertApi from 'api/alerts/save';
import ROUTES from 'constants/routes';
import QueryTypeTag from 'container/NewWidget/LeftContainer/QueryTypeTag';
import PlotTag from 'container/NewWidget/LeftContainer/WidgetGraph/PlotTag';
import history from 'lib/history';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from 'react-query';
import {
	IFormulaQueries,
	IMetricQueries,
	IPromQueries,
} from 'types/api/alerts/compositeQuery';
import {
	AlertDef,
	defaultEvalWindow,
	defaultMatchType,
} from 'types/api/alerts/def';
import { Query as StagedQuery } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';

import BasicInfo from './BasicInfo';
import ChartPreview from './ChartPreview';
import QuerySection from './QuerySection';
import RuleOptions from './RuleOptions';
import { ActionButton, ButtonContainer, MainFormContainer } from './styles';
import useDebounce from './useDebounce';
import {
	prepareBuilderQueries,
	prepareStagedQuery,
	toChartInterval,
	toFormulaQueries,
	toMetricQueries,
} from './utils';

function FormAlertRules({
	formInstance,
	initialValue,
	ruleId,
}: FormAlertRuleProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('rules');

	// use query client
	const ruleCache = useQueryClient();

	const [loading, setLoading] = useState(false);

	// alertDef holds the form values to be posted
	const [alertDef, setAlertDef] = useState<AlertDef>(initialValue);

	// initQuery contains initial query when component was mounted
	const initQuery = initialValue?.condition?.compositeMetricQuery;

	const [queryCategory, setQueryCategory] = useState<EQueryType>(
		initQuery?.queryType,
	);

	// local state to handle metric queries
	const [metricQueries, setMetricQueries] = useState<IMetricQueries>(
		toMetricQueries(initQuery?.builderQueries),
	);

	// local state to handle formula queries
	const [formulaQueries, setFormulaQueries] = useState<IFormulaQueries>(
		toFormulaQueries(initQuery?.builderQueries),
	);

	// local state to handle promql queries
	const [promQueries, setPromQueries] = useState<IPromQueries>({
		...initQuery?.promQueries,
	});

	// staged query is used to display chart preview
	const [stagedQuery, setStagedQuery] = useState<StagedQuery>();
	const debouncedStagedQuery = useDebounce(stagedQuery, 500);

	// this use effect initiates staged query and
	// other queries based on server data.
	// useful when fetching of initial values (from api)
	// is delayed
	useEffect(() => {
		const initQuery = initialValue?.condition?.compositeMetricQuery;
		const typ = initQuery?.queryType;

		// extract metric query from builderQueries
		const mq = toMetricQueries(initQuery?.builderQueries);

		// extract formula query from builderQueries
		const fq = toFormulaQueries(initQuery?.builderQueries);

		// prepare staged query
		const sq = prepareStagedQuery(typ, mq, fq, initQuery?.promQueries);
		const pq = initQuery?.promQueries;

		setQueryCategory(typ);
		setMetricQueries(mq);
		setFormulaQueries(fq);
		setPromQueries(pq);
		setStagedQuery(sq);
		setAlertDef(initialValue);
	}, [initialValue]);

	// this useEffect updates staging query when
	// any of its sub-parameters changes
	useEffect(() => {
		// prepare staged query
		const sq: StagedQuery = prepareStagedQuery(
			queryCategory,
			metricQueries,
			formulaQueries,
			promQueries,
		);
		setStagedQuery(sq);
	}, [queryCategory, metricQueries, formulaQueries, promQueries]);

	const onCancelHandler = useCallback(() => {
		history.replace(ROUTES.LIST_ALL_ALERT);
	}, []);

	// onQueryCategoryChange handles changes to query category
	// in state as well as sets additional defaults
	const onQueryCategoryChange = (val: EQueryType): void => {
		setQueryCategory(val);
		if (val === EQueryType.PROM) {
			setAlertDef({
				...alertDef,
				condition: {
					...alertDef.condition,
					matchType: defaultMatchType,
				},
				evalWindow: defaultEvalWindow,
			});
		}
	};

	const isFormValid = useCallback((): boolean => {
		let retval = true;

		if (!alertDef.alert || alertDef.alert === '') {
			notification.error({
				message: 'Error',
				description: t('alertname_required'),
			});
			return false;
		}

		if (
			queryCategory === EQueryType.PROM &&
			(!promQueries || Object.keys(promQueries).length === 0)
		) {
			notification.error({
				message: 'Error',
				description: t('promql_required'),
			});
			return false;
		}

		if (
			(queryCategory === EQueryType.QUERY_BUILDER && !metricQueries) ||
			Object.keys(metricQueries).length === 0
		) {
			notification.error({
				message: 'Error',
				description: t('condition_required'),
			});
			return false;
		}

		Object.keys(metricQueries).forEach((key) => {
			if (metricQueries[key].metricName === '') {
				retval = false;
				notification.error({
					message: 'Error',
					description: t('metricname_missing', { where: metricQueries[key].name }),
				});
			}
		});

		Object.keys(formulaQueries).forEach((key) => {
			if (formulaQueries[key].expression === '') {
				retval = false;
				notification.error({
					message: 'Error',
					description: t('expression_missing', formulaQueries[key].name),
				});
			}
		});

		return retval;
	}, [t, alertDef, queryCategory, metricQueries, formulaQueries, promQueries]);

	const saveRule = useCallback(async () => {
		if (!isFormValid()) {
			return;
		}

		const postableAlert: AlertDef = {
			...alertDef,
			ruleType:
				queryCategory === EQueryType.PROM ? 'promql_rule' : 'threshold_rule',
			condition: {
				...alertDef.condition,
				compositeMetricQuery: {
					builderQueries: prepareBuilderQueries(metricQueries, formulaQueries),
					promQueries,
					queryType: queryCategory,
				},
			},
		};

		setLoading(true);
		try {
			const apiReq =
				ruleId && ruleId > 0
					? { data: postableAlert, id: ruleId }
					: { data: postableAlert };

			const response = await saveAlertApi(apiReq);

			if (response.statusCode === 200) {
				notification.success({
					message: 'Success',
					description:
						!ruleId || ruleId === 0 ? t('rule_created') : t('rule_edited'),
				});
				console.log('invalidting cache');
				// invalidate rule in cache
				ruleCache.invalidateQueries(['ruleId', ruleId]);

				setTimeout(() => {
					history.replace(ROUTES.LIST_ALL_ALERT);
				}, 2000);
			} else {
				notification.error({
					message: 'Error',
					description: response.error || t('unexpected_error'),
				});
			}
		} catch (e) {
			console.log('save alert api failed:', e);
			notification.error({
				message: 'Error',
				description: t('unexpected_error'),
			});
		}
		setLoading(false);
	}, [
		t,
		isFormValid,
		queryCategory,
		ruleId,
		alertDef,
		metricQueries,
		formulaQueries,
		promQueries,
		ruleCache,
	]);

	const onSaveHandler = useCallback(async () => {
		const content = (
			<Typography.Text>
				{' '}
				{t('confirm_save_content_part1')} <QueryTypeTag queryType={queryCategory} />{' '}
				{t('confirm_save_content_part2')}
			</Typography.Text>
		);
		Modal.confirm({
			icon: <ExclamationCircleOutlined />,
			title: t('confirm_save_title'),
			centered: true,
			content,
			onOk() {
				saveRule();
			},
		});
	}, [t, saveRule, queryCategory]);

	const renderBasicInfo = (): JSX.Element => (
		<BasicInfo alertDef={alertDef} setAlertDef={setAlertDef} />
	);

	const renderQBChartPreview = (): JSX.Element => {
		return (
			<ChartPreview
				headline={<PlotTag queryType={queryCategory} />}
				name=""
				threshold={alertDef.condition?.target}
				query={debouncedStagedQuery}
				selectedInterval={toChartInterval(alertDef.evalWindow)}
			/>
		);
	};

	const renderPromChartPreview = (): JSX.Element => {
		return (
			<ChartPreview
				headline={<PlotTag queryType={queryCategory} />}
				name="Chart Preview"
				threshold={alertDef.condition?.target}
				query={debouncedStagedQuery}
			/>
		);
	};

	return (
		<>
			{Element}
			<MainFormContainer
				initialValues={initialValue}
				layout="vertical"
				form={formInstance}
			>
				{queryCategory === EQueryType.QUERY_BUILDER && renderQBChartPreview()}
				{queryCategory === EQueryType.PROM && renderPromChartPreview()}
				<QuerySection
					queryCategory={queryCategory}
					setQueryCategory={onQueryCategoryChange}
					metricQueries={metricQueries}
					setMetricQueries={setMetricQueries}
					formulaQueries={formulaQueries}
					setFormulaQueries={setFormulaQueries}
					promQueries={promQueries}
					setPromQueries={setPromQueries}
				/>

				<RuleOptions
					queryCategory={queryCategory}
					alertDef={alertDef}
					setAlertDef={setAlertDef}
				/>

				{renderBasicInfo()}
				<ButtonContainer>
					<ActionButton
						loading={loading || false}
						type="primary"
						onClick={onSaveHandler}
						icon={<SaveOutlined />}
					>
						{ruleId > 0 ? t('button_savechanges') : t('button_createrule')}
					</ActionButton>
					<ActionButton
						disabled={loading || false}
						type="default"
						onClick={onCancelHandler}
					>
						{ruleId === 0 && t('button_cancelchanges')}
						{ruleId > 0 && t('button_discard')}
					</ActionButton>
				</ButtonContainer>
			</MainFormContainer>
		</>
	);
}

interface FormAlertRuleProps {
	formInstance: FormInstance;
	initialValue: AlertDef;
	ruleId: number;
}

export default FormAlertRules;
