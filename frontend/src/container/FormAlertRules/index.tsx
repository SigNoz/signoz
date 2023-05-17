import { ExclamationCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { Col, FormInstance, Modal, Typography } from 'antd';
import saveAlertApi from 'api/alerts/save';
import testAlertApi from 'api/alerts/testAlert';
import ROUTES from 'constants/routes';
import QueryTypeTag from 'container/NewWidget/LeftContainer/QueryTypeTag';
import PlotTag from 'container/NewWidget/LeftContainer/WidgetGraph/PlotTag';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { mapQueryDataToApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataToApi';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from 'react-query';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { IChQueries, IPromQueries } from 'types/api/alerts/compositeQuery';
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
import {
	ActionButton,
	ButtonContainer,
	MainFormContainer,
	PanelContainer,
	StyledLeftContainer,
} from './styles';
import UserGuide from './UserGuide';
import { prepareStagedQuery, toChartInterval } from './utils';

function FormAlertRules({
	alertType,
	formInstance,
	initialValue,
	ruleId,
}: FormAlertRuleProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	const { queryBuilderData, initQueryBuilderData } = useQueryBuilder();

	// use query client
	const ruleCache = useQueryClient();

	const [loading, setLoading] = useState(false);

	// alertDef holds the form values to be posted
	const [alertDef, setAlertDef] = useState<AlertDef>(initialValue);

	// initQuery contains initial query when component was mounted
	const initQuery = initialValue.condition.compositeQuery;

	const [queryCategory, setQueryCategory] = useState<EQueryType>(
		initQuery.queryType,
	);

	// local state to handle promql queries
	const [promQueries, setPromQueries] = useState<IPromQueries>({
		...initQuery?.promQueries,
	});

	// local state to handle promql queries
	const [chQueries, setChQueries] = useState<IChQueries>({
		...initQuery?.chQueries,
	});

	// staged query is used to display chart preview. the query gets
	// auto refreshed when any of the params in query section change.
	// though this is the source of chart data, the final query used
	// by chart will be either debouncedStagedQuery or manualStagedQuery
	// depending on the run option (auto-run or use of run query button)
	const [stagedQuery, setStagedQuery] = useState<StagedQuery>();

	// manualStagedQuery requires manual staging of query
	// when user clicks run query button. Useful for clickhouse tab where
	// run query button is provided.
	const [manualStagedQuery, setManualStagedQuery] = useState<StagedQuery>();

	// this use effect initiates staged query and
	// other queries based on server data.
	// useful when fetching of initial values (from api)
	// is delayed
	useEffect(() => {
		const initQuery = initialValue?.condition?.compositeQuery;
		const type = initQuery.queryType;

		const builderData = mapQueryDataFromApi(
			initialValue?.condition?.compositeQuery?.builderQueries || {},
		);

		// prepare staged query
		const sq = prepareStagedQuery(
			type,
			builderData.queryData,
			builderData.queryFormulas,
			initQuery?.promQueries,
			initQuery?.chQueries,
		);
		const pq = initQuery?.promQueries;
		const chq = initQuery?.chQueries;

		setQueryCategory(type);
		initQueryBuilderData(builderData);
		setPromQueries(pq);
		setStagedQuery(sq);

		// also set manually staged query
		setManualStagedQuery(sq);

		setChQueries(chq);
		setAlertDef(initialValue);
	}, [initialValue, initQueryBuilderData]);

	// this useEffect updates staging query when
	// any of its sub-parameters changes
	useEffect(() => {
		// prepare staged query
		const sq: StagedQuery = prepareStagedQuery(
			queryCategory,
			queryBuilderData.queryData,
			queryBuilderData.queryFormulas,
			promQueries,
			chQueries,
		);
		setStagedQuery(sq);
	}, [queryCategory, chQueries, queryBuilderData, promQueries]);

	const onRunQuery = (): void => {
		setManualStagedQuery(stagedQuery);
	};

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

		const sq: StagedQuery = prepareStagedQuery(
			val,
			queryBuilderData.queryData,
			queryBuilderData.queryFormulas,
			promQueries,
			chQueries,
		);
		setManualStagedQuery(sq);
	};
	const { notifications } = useNotifications();

	const validatePromParams = useCallback((): boolean => {
		let retval = true;
		if (queryCategory !== EQueryType.PROM) return retval;

		if (!promQueries || Object.keys(promQueries).length === 0) {
			notifications.error({
				message: 'Error',
				description: t('promql_required'),
			});
			return false;
		}

		Object.keys(promQueries).forEach((key) => {
			if (promQueries[key].query === '') {
				notifications.error({
					message: 'Error',
					description: t('promql_required'),
				});
				retval = false;
			}
		});

		return retval;
	}, [t, promQueries, queryCategory, notifications]);

	const validateChQueryParams = useCallback((): boolean => {
		let retval = true;
		if (queryCategory !== EQueryType.CLICKHOUSE) return retval;

		if (!chQueries || Object.keys(chQueries).length === 0) {
			notifications.error({
				message: 'Error',
				description: t('chquery_required'),
			});
			return false;
		}

		Object.keys(chQueries).forEach((key) => {
			if (chQueries[key].rawQuery === '') {
				notifications.error({
					message: 'Error',
					description: t('chquery_required'),
				});
				retval = false;
			}
		});

		return retval;
	}, [t, chQueries, queryCategory, notifications]);

	const validateQBParams = useCallback((): boolean => {
		if (queryCategory !== EQueryType.QUERY_BUILDER) return true;

		if (!queryBuilderData.queryData || queryBuilderData.queryData.length === 0) {
			notifications.error({
				message: 'Error',
				description: t('condition_required'),
			});
			return false;
		}

		if (alertDef.condition?.target !== 0 && !alertDef.condition?.target) {
			notifications.error({
				message: 'Error',
				description: t('target_missing'),
			});
			return false;
		}

		return true;
	}, [t, alertDef, queryCategory, queryBuilderData, notifications]);

	const isFormValid = useCallback((): boolean => {
		if (!alertDef.alert || alertDef.alert === '') {
			notifications.error({
				message: 'Error',
				description: t('alertname_required'),
			});
			return false;
		}

		if (!validatePromParams()) {
			return false;
		}

		if (!validateChQueryParams()) {
			return false;
		}

		return validateQBParams();
	}, [
		t,
		validateQBParams,
		validateChQueryParams,
		alertDef,
		validatePromParams,
		notifications,
	]);

	const preparePostData = (): AlertDef => {
		const postableAlert: AlertDef = {
			...alertDef,
			alertType,
			source: window?.location.toString(),
			ruleType:
				queryCategory === EQueryType.PROM ? 'promql_rule' : 'threshold_rule',
			condition: {
				...alertDef.condition,
				compositeQuery: {
					builderQueries: mapQueryDataToApi(queryBuilderData).data,
					promQueries,
					chQueries,
					queryType: queryCategory,
					panelType: initQuery.panelType,
				},
			},
		};
		return postableAlert;
	};

	const memoizedPreparePostData = useCallback(preparePostData, [
		queryCategory,
		alertDef,
		queryBuilderData,
		promQueries,
		chQueries,
		alertType,
		initQuery,
	]);

	const saveRule = useCallback(async () => {
		if (!isFormValid()) {
			return;
		}
		const postableAlert = memoizedPreparePostData();

		setLoading(true);
		try {
			const apiReq =
				ruleId && ruleId > 0
					? { data: postableAlert, id: ruleId }
					: { data: postableAlert };

			const response = await saveAlertApi(apiReq);

			if (response.statusCode === 200) {
				notifications.success({
					message: 'Success',
					description:
						!ruleId || ruleId === 0 ? t('rule_created') : t('rule_edited'),
				});

				// invalidate rule in cache
				ruleCache.invalidateQueries(['ruleId', ruleId]);

				setTimeout(() => {
					history.replace(ROUTES.LIST_ALL_ALERT);
				}, 2000);
			} else {
				notifications.error({
					message: 'Error',
					description: response.error || t('unexpected_error'),
				});
			}
		} catch (e) {
			notifications.error({
				message: 'Error',
				description: t('unexpected_error'),
			});
		}
		setLoading(false);
	}, [
		t,
		isFormValid,
		ruleId,
		ruleCache,
		memoizedPreparePostData,
		notifications,
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

	const onTestRuleHandler = useCallback(async () => {
		if (!isFormValid()) {
			return;
		}
		const postableAlert = memoizedPreparePostData();

		setLoading(true);
		try {
			const response = await testAlertApi({ data: postableAlert });

			if (response.statusCode === 200) {
				const { payload } = response;
				if (payload?.alertCount === 0) {
					notifications.error({
						message: 'Error',
						description: t('no_alerts_found'),
					});
				} else {
					notifications.success({
						message: 'Success',
						description: t('rule_test_fired'),
					});
				}
			} else {
				notifications.error({
					message: 'Error',
					description: response.error || t('unexpected_error'),
				});
			}
		} catch (e) {
			notifications.error({
				message: 'Error',
				description: t('unexpected_error'),
			});
		}
		setLoading(false);
	}, [t, isFormValid, memoizedPreparePostData, notifications]);

	const renderBasicInfo = (): JSX.Element => (
		<BasicInfo alertDef={alertDef} setAlertDef={setAlertDef} />
	);

	const renderQBChartPreview = (): JSX.Element => (
		<ChartPreview
			headline={<PlotTag queryType={queryCategory} />}
			name=""
			threshold={alertDef.condition?.target}
			query={manualStagedQuery}
			selectedInterval={toChartInterval(alertDef.evalWindow)}
		/>
	);

	const renderPromChartPreview = (): JSX.Element => (
		<ChartPreview
			headline={<PlotTag queryType={queryCategory} />}
			name="Chart Preview"
			threshold={alertDef.condition?.target}
			query={manualStagedQuery}
		/>
	);

	const renderChQueryChartPreview = (): JSX.Element => (
		<ChartPreview
			headline={<PlotTag queryType={queryCategory} />}
			name="Chart Preview"
			threshold={alertDef.condition?.target}
			query={manualStagedQuery}
			selectedInterval={toChartInterval(alertDef.evalWindow)}
		/>
	);
	return (
		<>
			{Element}
			<PanelContainer>
				<StyledLeftContainer flex="5 1 600px">
					<MainFormContainer
						initialValues={initialValue}
						layout="vertical"
						form={formInstance}
					>
						{queryCategory === EQueryType.QUERY_BUILDER && renderQBChartPreview()}
						{queryCategory === EQueryType.PROM && renderPromChartPreview()}
						{queryCategory === EQueryType.CLICKHOUSE && renderChQueryChartPreview()}
						<QuerySection
							queryCategory={queryCategory}
							setQueryCategory={onQueryCategoryChange}
							promQueries={promQueries}
							setPromQueries={setPromQueries}
							chQueries={chQueries}
							setChQueries={setChQueries}
							alertType={alertType || AlertTypes.METRICS_BASED_ALERT}
							runQuery={onRunQuery}
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
								loading={loading || false}
								type="default"
								onClick={onTestRuleHandler}
							>
								{' '}
								{t('button_testrule')}
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
				</StyledLeftContainer>
				<Col flex="1 1 300px">
					<UserGuide queryType={queryCategory} />
				</Col>
			</PanelContainer>
		</>
	);
}

FormAlertRules.defaultProps = {
	alertType: AlertTypes.METRICS_BASED_ALERT,
};

interface FormAlertRuleProps {
	alertType?: AlertTypes;
	formInstance: FormInstance;
	initialValue: AlertDef;
	ruleId: number;
}

export default FormAlertRules;
