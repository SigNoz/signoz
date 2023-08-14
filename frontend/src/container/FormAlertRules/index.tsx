import { ExclamationCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { Col, FormInstance, Modal, Tooltip, Typography } from 'antd';
import saveAlertApi from 'api/alerts/save';
import testAlertApi from 'api/alerts/testAlert';
import { FeatureKeys } from 'constants/features';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import QueryTypeTag from 'container/NewWidget/LeftContainer/QueryTypeTag';
import PlotTag from 'container/NewWidget/LeftContainer/WidgetGraph/PlotTag';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { updateStepInterval } from 'hooks/queryBuilder/useStepInterval';
import { MESSAGE, useIsFeatureDisabled } from 'hooks/useFeatureFlag';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { mapQueryDataToApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataToApi';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import {
	AlertDef,
	defaultEvalWindow,
	defaultMatchType,
} from 'types/api/alerts/def';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';

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
import { toChartInterval } from './utils';

function FormAlertRules({
	alertType,
	formInstance,
	initialValue,
	ruleId,
}: FormAlertRuleProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const {
		currentQuery,
		panelType,
		stagedQuery,
		handleRunQuery,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	// use query client
	const ruleCache = useQueryClient();

	const [loading, setLoading] = useState(false);

	// alertDef holds the form values to be posted
	const [alertDef, setAlertDef] = useState<AlertDef>(initialValue);

	// initQuery contains initial query when component was mounted
	const initQuery = useMemo(() => initialValue.condition.compositeQuery, [
		initialValue,
	]);

	const sq = useMemo(() => mapQueryDataFromApi(initQuery), [initQuery]);

	useShareBuilderUrl(sq);

	useEffect(() => {
		setAlertDef(initialValue);
	}, [initialValue]);

	const onCancelHandler = useCallback(() => {
		history.replace(ROUTES.LIST_ALL_ALERT);
	}, []);

	// onQueryCategoryChange handles changes to query category
	// in state as well as sets additional defaults
	const onQueryCategoryChange = (val: EQueryType): void => {
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
		const query: Query = { ...currentQuery, queryType: val };

		redirectWithQueryBuilderData(updateStepInterval(query, maxTime, minTime));
	};
	const { notifications } = useNotifications();

	const validatePromParams = useCallback((): boolean => {
		let retval = true;
		if (currentQuery.queryType !== EQueryType.PROM) return retval;

		if (!currentQuery.promql || currentQuery.promql.length === 0) {
			notifications.error({
				message: 'Error',
				description: t('promql_required'),
			});
			return false;
		}

		currentQuery.promql.forEach((item) => {
			if (item.query === '') {
				notifications.error({
					message: 'Error',
					description: t('promql_required'),
				});
				retval = false;
			}
		});

		return retval;
	}, [t, currentQuery, notifications]);

	const validateChQueryParams = useCallback((): boolean => {
		let retval = true;
		if (currentQuery.queryType !== EQueryType.CLICKHOUSE) return retval;

		if (
			!currentQuery.clickhouse_sql ||
			currentQuery.clickhouse_sql.length === 0
		) {
			notifications.error({
				message: 'Error',
				description: t('chquery_required'),
			});
			return false;
		}

		currentQuery.clickhouse_sql.forEach((item) => {
			if (item.query === '') {
				notifications.error({
					message: 'Error',
					description: t('chquery_required'),
				});
				retval = false;
			}
		});

		return retval;
	}, [t, currentQuery, notifications]);

	const validateQBParams = useCallback((): boolean => {
		if (currentQuery.queryType !== EQueryType.QUERY_BUILDER) return true;

		if (
			!currentQuery.builder.queryData ||
			currentQuery.builder.queryData.length === 0
		) {
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
	}, [t, alertDef, currentQuery, notifications]);

	const isFormValid = useCallback((): boolean => {
		if (!alertDef.alert || alertDef.alert === '') {
			return false;
		}

		if (!validatePromParams()) {
			return false;
		}

		if (!validateChQueryParams()) {
			return false;
		}

		return validateQBParams();
	}, [validateQBParams, validateChQueryParams, alertDef, validatePromParams]);

	const preparePostData = (): AlertDef => {
		const postableAlert: AlertDef = {
			...alertDef,
			alertType,
			source: window?.location.toString(),
			ruleType:
				currentQuery.queryType === EQueryType.PROM
					? 'promql_rule'
					: 'threshold_rule',
			condition: {
				...alertDef.condition,
				compositeQuery: {
					builderQueries: {
						...mapQueryDataToApi(currentQuery.builder.queryData, 'queryName').data,
						...mapQueryDataToApi(currentQuery.builder.queryFormulas, 'queryName')
							.data,
					},
					promQueries: mapQueryDataToApi(currentQuery.promql, 'name').data,
					chQueries: mapQueryDataToApi(currentQuery.clickhouse_sql, 'name').data,
					queryType: currentQuery.queryType,
					panelType: initQuery.panelType,
				},
			},
		};
		return postableAlert;
	};

	const memoizedPreparePostData = useCallback(preparePostData, [
		currentQuery,
		alertDef,
		alertType,
		initQuery,
	]);

	const isAlertAvialable = useIsFeatureDisabled(
		FeatureKeys.QUERY_BUILDER_ALERTS,
	);

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
				{t('confirm_save_content_part1')}{' '}
				<QueryTypeTag queryType={currentQuery.queryType} />{' '}
				{t('confirm_save_content_part2')}
			</Typography.Text>
		);
		Modal.confirm({
			icon: <ExclamationCircleOutlined />,
			title: t('confirm_save_title'),
			centered: true,
			content,
			onOk: saveRule,
		});
	}, [t, saveRule, currentQuery]);

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
			headline={
				<PlotTag
					queryType={currentQuery.queryType}
					panelType={panelType || PANEL_TYPES.TIME_SERIES}
				/>
			}
			name=""
			threshold={alertDef.condition?.target}
			query={stagedQuery}
			selectedInterval={toChartInterval(alertDef.evalWindow)}
		/>
	);

	const renderPromChartPreview = (): JSX.Element => (
		<ChartPreview
			headline={
				<PlotTag
					queryType={currentQuery.queryType}
					panelType={panelType || PANEL_TYPES.TIME_SERIES}
				/>
			}
			name="Chart Preview"
			threshold={alertDef.condition?.target}
			query={stagedQuery}
		/>
	);

	const renderChQueryChartPreview = (): JSX.Element => (
		<ChartPreview
			headline={
				<PlotTag
					queryType={currentQuery.queryType}
					panelType={panelType || PANEL_TYPES.TIME_SERIES}
				/>
			}
			name="Chart Preview"
			threshold={alertDef.condition?.target}
			query={stagedQuery}
			selectedInterval={toChartInterval(alertDef.evalWindow)}
		/>
	);

	const isNewRule = ruleId === 0;

	const isAlertNameMissing = !formInstance.getFieldValue('alert');

	const isAlertAvialableToSave =
		isAlertAvialable &&
		currentQuery.queryType === EQueryType.QUERY_BUILDER &&
		alertType !== AlertTypes.METRICS_BASED_ALERT;

	return (
		<>
			{Element}
			<PanelContainer>
				<StyledLeftContainer flex="5 1 600px" md={18}>
					<MainFormContainer
						initialValues={initialValue}
						layout="vertical"
						form={formInstance}
					>
						{currentQuery.queryType === EQueryType.QUERY_BUILDER &&
							renderQBChartPreview()}
						{currentQuery.queryType === EQueryType.PROM && renderPromChartPreview()}
						{currentQuery.queryType === EQueryType.CLICKHOUSE &&
							renderChQueryChartPreview()}
						<QuerySection
							queryCategory={currentQuery.queryType}
							setQueryCategory={onQueryCategoryChange}
							alertType={alertType || AlertTypes.METRICS_BASED_ALERT}
							runQuery={handleRunQuery}
						/>

						<RuleOptions
							queryCategory={currentQuery.queryType}
							alertDef={alertDef}
							setAlertDef={setAlertDef}
						/>

						{renderBasicInfo()}
						<ButtonContainer>
							<Tooltip title={isAlertAvialableToSave ? MESSAGE.ALERT : ''}>
								<ActionButton
									loading={loading || false}
									type="primary"
									onClick={onSaveHandler}
									icon={<SaveOutlined />}
									disabled={isAlertNameMissing || isAlertAvialableToSave}
								>
									{isNewRule ? t('button_createrule') : t('button_savechanges')}
								</ActionButton>
							</Tooltip>

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
					<UserGuide queryType={currentQuery.queryType} />
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
