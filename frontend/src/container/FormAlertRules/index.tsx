import './FormAlertRules.styles.scss';

import { ExclamationCircleOutlined, SaveOutlined } from '@ant-design/icons';
import {
	Button,
	Col,
	FormInstance,
	Modal,
	SelectProps,
	Tooltip,
	Typography,
} from 'antd';
import saveAlertApi from 'api/alerts/save';
import testAlertApi from 'api/alerts/testAlert';
import logEvent from 'api/common/logEvent';
import LaunchChatSupport from 'components/LaunchChatSupport/LaunchChatSupport';
import { alertHelpMessage } from 'components/LaunchChatSupport/util';
import { ALERTS_DATA_SOURCE_MAP } from 'constants/alerts';
import { FeatureKeys } from 'constants/features';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import QueryTypeTag from 'container/NewWidget/LeftContainer/QueryTypeTag';
import PlotTag from 'container/NewWidget/LeftContainer/WidgetGraph/PlotTag';
import { BuilderUnitsFilter } from 'container/QueryBuilder/filters';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { MESSAGE, useIsFeatureDisabled } from 'hooks/useFeatureFlag';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { mapQueryDataToApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataToApi';
import { isEqual } from 'lodash-es';
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
	StepContainer,
	StyledLeftContainer,
} from './styles';
import UserGuide from './UserGuide';
import { getSelectedQueryOptions } from './utils';

// eslint-disable-next-line sonarjs/cognitive-complexity
function FormAlertRules({
	alertType,
	formInstance,
	initialValue,
	ruleId,
}: FormAlertRuleProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const urlQuery = useUrlQuery();

	// In case of alert the panel types should always be "Graph" only
	const panelType = PANEL_TYPES.TIME_SERIES;

	const {
		currentQuery,
		stagedQuery,
		handleRunQuery,
		handleSetConfig,
		initialDataSource,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	useEffect(() => {
		handleSetConfig(panelType || PANEL_TYPES.TIME_SERIES, initialDataSource);
	}, [handleSetConfig, initialDataSource, panelType]);

	// use query client
	const ruleCache = useQueryClient();

	const isNewRule = ruleId === 0;

	const [loading, setLoading] = useState(false);
	const [queryStatus, setQueryStatus] = useState<string>('');

	// alertDef holds the form values to be posted
	const [alertDef, setAlertDef] = useState<AlertDef>(initialValue);
	const [yAxisUnit, setYAxisUnit] = useState<string>(currentQuery.unit || '');

	useEffect(() => {
		if (!isEqual(currentQuery.unit, yAxisUnit)) {
			setYAxisUnit(currentQuery.unit || '');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentQuery.unit]);

	// initQuery contains initial query when component was mounted
	const initQuery = useMemo(() => initialValue.condition.compositeQuery, [
		initialValue,
	]);

	const queryOptions = useMemo(() => {
		const queryConfig: Record<EQueryType, () => SelectProps['options']> = {
			[EQueryType.QUERY_BUILDER]: () => [
				...(getSelectedQueryOptions(currentQuery.builder.queryData) || []),
				...(getSelectedQueryOptions(currentQuery.builder.queryFormulas) || []),
			],
			[EQueryType.PROM]: () => getSelectedQueryOptions(currentQuery.promql),
			[EQueryType.CLICKHOUSE]: () =>
				getSelectedQueryOptions(currentQuery.clickhouse_sql),
		};

		return queryConfig[currentQuery.queryType]?.() || [];
	}, [currentQuery]);

	const sq = useMemo(() => mapQueryDataFromApi(initQuery), [initQuery]);

	useShareBuilderUrl(sq);

	useEffect(() => {
		const broadcastToSpecificChannels =
			(initialValue &&
				initialValue.preferredChannels &&
				initialValue.preferredChannels.length > 0) ||
			isNewRule;

		setAlertDef({
			...initialValue,
			broadcastToAll: !broadcastToSpecificChannels,
		});
	}, [initialValue, isNewRule]);

	useEffect(() => {
		// Set selectedQueryName based on the length of queryOptions
		const selectedQueryName = alertDef?.condition?.selectedQueryName;
		if (
			!selectedQueryName ||
			!queryOptions.some((option) => option.value === selectedQueryName)
		) {
			setAlertDef((def) => ({
				...def,
				condition: {
					...def.condition,
					selectedQueryName:
						queryOptions.length > 0 ? String(queryOptions[0].value) : undefined,
				},
			}));
		}
	}, [alertDef, currentQuery?.queryType, queryOptions]);

	const onCancelHandler = useCallback(() => {
		urlQuery.delete(QueryParams.compositeQuery);
		urlQuery.delete(QueryParams.panelTypes);
		urlQuery.delete(QueryParams.ruleId);
		urlQuery.delete(QueryParams.relativeTime);
		history.replace(`${ROUTES.LIST_ALL_ALERT}?${urlQuery.toString()}`);
	}, [urlQuery]);

	// onQueryCategoryChange handles changes to query category
	// in state as well as sets additional defaults
	const onQueryCategoryChange = (val: EQueryType): void => {
		const element = document.getElementById('top');
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' });
		}
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

		// update step interval is removed from here as if the user enters
		// any value we will use that rather than auto update
		redirectWithQueryBuilderData(query);
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
			currentQuery.builder.queryData?.length === 0
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
			preferredChannels: alertDef.broadcastToAll ? [] : alertDef.preferredChannels,
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
					panelType: panelType || initQuery.panelType,
					unit: currentQuery.unit,
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
		panelType,
	]);

	const isAlertAvailable = useIsFeatureDisabled(
		FeatureKeys.QUERY_BUILDER_ALERTS,
	);

	const saveRule = useCallback(async () => {
		if (!isFormValid()) {
			return;
		}
		const postableAlert = memoizedPreparePostData();
		setLoading(true);

		let logData = {
			status: 'error',
			statusMessage: t('unexpected_error'),
		};

		try {
			const apiReq =
				ruleId && ruleId > 0
					? { data: postableAlert, id: ruleId }
					: { data: postableAlert };

			const response = await saveAlertApi(apiReq);

			if (response.statusCode === 200) {
				logData = {
					status: 'success',
					statusMessage:
						!ruleId || ruleId === 0 ? t('rule_created') : t('rule_edited'),
				};

				notifications.success({
					message: 'Success',
					description: logData.statusMessage,
				});

				// invalidate rule in cache
				ruleCache.invalidateQueries([
					REACT_QUERY_KEY.ALERT_RULE_DETAILS,
					`${ruleId}`,
				]);

				// eslint-disable-next-line sonarjs/no-identical-functions
				setTimeout(() => {
					urlQuery.delete(QueryParams.compositeQuery);
					urlQuery.delete(QueryParams.panelTypes);
					urlQuery.delete(QueryParams.ruleId);
					urlQuery.delete(QueryParams.relativeTime);
					history.replace(`${ROUTES.LIST_ALL_ALERT}?${urlQuery.toString()}`);
				}, 2000);
			} else {
				logData = {
					status: 'error',
					statusMessage: response.error || t('unexpected_error'),
				};

				notifications.error({
					message: 'Error',
					description: logData.statusMessage,
				});
			}
		} catch (e) {
			logData = {
				status: 'error',
				statusMessage: t('unexpected_error'),
			};

			notifications.error({
				message: 'Error',
				description: logData.statusMessage,
			});
		}

		setLoading(false);

		logEvent('Alert: Save alert', {
			...logData,
			dataSource: ALERTS_DATA_SOURCE_MAP[postableAlert?.alertType as AlertTypes],
			channelNames: postableAlert?.preferredChannels,
			broadcastToAll: postableAlert?.broadcastToAll,
			isNewRule: !ruleId || ruleId === 0,
			ruleId,
			queryType: currentQuery.queryType,
			alertId: postableAlert?.id,
			alertName: postableAlert?.alert,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isFormValid,
		memoizedPreparePostData,
		ruleId,
		notifications,
		t,
		ruleCache,
		urlQuery,
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
			className: 'create-alert-modal',
		});
	}, [t, saveRule, currentQuery]);

	const onTestRuleHandler = useCallback(async () => {
		if (!isFormValid()) {
			return;
		}
		const postableAlert = memoizedPreparePostData();

		let statusResponse = { status: 'failed', message: '' };
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
					statusResponse = { status: 'failed', message: t('no_alerts_found') };
				} else {
					notifications.success({
						message: 'Success',
						description: t('rule_test_fired'),
					});
					statusResponse = { status: 'success', message: t('rule_test_fired') };
				}
			} else {
				notifications.error({
					message: 'Error',
					description: response.error || t('unexpected_error'),
				});
				statusResponse = {
					status: 'failed',
					message: response.error || t('unexpected_error'),
				};
			}
		} catch (e) {
			notifications.error({
				message: 'Error',
				description: t('unexpected_error'),
			});
			statusResponse = { status: 'failed', message: t('unexpected_error') };
		}
		setLoading(false);
		logEvent('Alert: Test notification', {
			dataSource: ALERTS_DATA_SOURCE_MAP[alertDef?.alertType as AlertTypes],
			channelNames: postableAlert?.preferredChannels,
			broadcastToAll: postableAlert?.broadcastToAll,
			isNewRule: !ruleId || ruleId === 0,
			ruleId,
			queryType: currentQuery.queryType,
			status: statusResponse.status,
			statusMessage: statusResponse.message,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [t, isFormValid, memoizedPreparePostData, notifications]);

	const renderBasicInfo = (): JSX.Element => (
		<BasicInfo
			alertDef={alertDef}
			setAlertDef={setAlertDef}
			isNewRule={isNewRule}
		/>
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
			query={stagedQuery}
			selectedInterval={globalSelectedInterval}
			alertDef={alertDef}
			yAxisUnit={yAxisUnit || ''}
			graphType={panelType || PANEL_TYPES.TIME_SERIES}
			setQueryStatus={setQueryStatus}
		/>
	);

	const renderPromAndChQueryChartPreview = (): JSX.Element => (
		<ChartPreview
			headline={
				<PlotTag
					queryType={currentQuery.queryType}
					panelType={panelType || PANEL_TYPES.TIME_SERIES}
				/>
			}
			name="Chart Preview"
			query={stagedQuery}
			alertDef={alertDef}
			selectedInterval={globalSelectedInterval}
			yAxisUnit={yAxisUnit || ''}
			graphType={panelType || PANEL_TYPES.TIME_SERIES}
			setQueryStatus={setQueryStatus}
		/>
	);

	const isAlertNameMissing = !formInstance.getFieldValue('alert');

	const isAlertAvailableToSave =
		isAlertAvailable &&
		currentQuery.queryType === EQueryType.QUERY_BUILDER &&
		alertType !== AlertTypes.METRICS_BASED_ALERT;

	const onUnitChangeHandler = (value: string): void => {
		setYAxisUnit(value);
		// reset target unit
		setAlertDef((def) => ({
			...def,
			condition: {
				...def.condition,
				targetUnit: undefined,
			},
		}));
	};

	const isChannelConfigurationValid =
		alertDef?.broadcastToAll ||
		(alertDef.preferredChannels && alertDef.preferredChannels.length > 0);

	const isRuleCreated = !ruleId || ruleId === 0;

	useEffect(() => {
		if (!isRuleCreated) {
			logEvent('Alert: Edit page visited', {
				ruleId,
				dataSource: ALERTS_DATA_SOURCE_MAP[alertType as AlertTypes],
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function handleRedirection(option: AlertTypes): void {
		let url = '';
		switch (option) {
			case AlertTypes.METRICS_BASED_ALERT:
				url =
					'https://signoz.io/docs/alerts-management/metrics-based-alerts/?utm_source=product&utm_medium=alert-creation-page#examples';
				break;
			case AlertTypes.LOGS_BASED_ALERT:
				url =
					'https://signoz.io/docs/alerts-management/log-based-alerts/?utm_source=product&utm_medium=alert-creation-page#examples';
				break;
			case AlertTypes.TRACES_BASED_ALERT:
				url =
					'https://signoz.io/docs/alerts-management/trace-based-alerts/?utm_source=product&utm_medium=alert-creation-page#examples';
				break;
			case AlertTypes.EXCEPTIONS_BASED_ALERT:
				url =
					'https://signoz.io/docs/alerts-management/exceptions-based-alerts/?utm_source=product&utm_medium=alert-creation-page#examples';
				break;
			default:
				break;
		}
		logEvent('Alert: Check example alert clicked', {
			dataSource: ALERTS_DATA_SOURCE_MAP[alertDef?.alertType as AlertTypes],
			isNewRule: !ruleId || ruleId === 0,
			ruleId,
			queryType: currentQuery.queryType,
			link: url,
		});
		window.open(url, '_blank');
	}

	return (
		<>
			{Element}

			<PanelContainer id="top">
				<StyledLeftContainer flex="5 1 600px" md={18}>
					<MainFormContainer
						initialValues={initialValue}
						layout="vertical"
						form={formInstance}
						className="main-container"
					>
						{currentQuery.queryType === EQueryType.QUERY_BUILDER &&
							renderQBChartPreview()}
						{currentQuery.queryType === EQueryType.PROM &&
							renderPromAndChQueryChartPreview()}
						{currentQuery.queryType === EQueryType.CLICKHOUSE &&
							renderPromAndChQueryChartPreview()}

						<StepContainer>
							<BuilderUnitsFilter
								onChange={onUnitChangeHandler}
								yAxisUnit={yAxisUnit}
							/>
						</StepContainer>

						<QuerySection
							queryCategory={currentQuery.queryType}
							setQueryCategory={onQueryCategoryChange}
							alertType={alertType || AlertTypes.METRICS_BASED_ALERT}
							runQuery={(): void => handleRunQuery(true)}
							alertDef={alertDef}
							panelType={panelType || PANEL_TYPES.TIME_SERIES}
							key={currentQuery.queryType}
							ruleId={ruleId}
						/>

						<RuleOptions
							queryCategory={currentQuery.queryType}
							alertDef={alertDef}
							setAlertDef={setAlertDef}
							queryOptions={queryOptions}
						/>

						{renderBasicInfo()}
						<ButtonContainer>
							<Tooltip title={isAlertAvailableToSave ? MESSAGE.ALERT : ''}>
								<ActionButton
									loading={loading || false}
									type="primary"
									onClick={onSaveHandler}
									icon={<SaveOutlined />}
									disabled={
										isAlertNameMissing ||
										isAlertAvailableToSave ||
										!isChannelConfigurationValid ||
										queryStatus === 'error'
									}
								>
									{isNewRule ? t('button_createrule') : t('button_savechanges')}
								</ActionButton>
							</Tooltip>

							<ActionButton
								loading={loading || false}
								disabled={
									isAlertNameMissing ||
									!isChannelConfigurationValid ||
									queryStatus === 'error'
								}
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
					<div className="info-help-btns">
						<Button
							style={{ height: 32 }}
							onClick={(): void =>
								handleRedirection(alertDef?.alertType as AlertTypes)
							}
							className="doc-redirection-btn"
						>
							Check an example alert
						</Button>
						<LaunchChatSupport
							attributes={{
								alert: alertDef?.alert,
								alertType: alertDef?.alertType,
								id: ruleId,
								ruleType: alertDef?.ruleType,
								state: (alertDef as any)?.state,
								panelType,
								screen: isRuleCreated ? 'Edit Alert' : 'New Alert',
							}}
							className="facing-issue-btn"
							eventName="Alert: Facing Issues in alert"
							buttonText="Need help with this alert?"
							message={alertHelpMessage(alertDef, ruleId)}
							onHoverText="Click here to get help with this alert"
						/>
					</div>
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
