import './FormAlertRules.styles.scss';

import { ExclamationCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, FormInstance, Modal, SelectProps, Typography } from 'antd';
import saveAlertApi from 'api/alerts/save';
import testAlertApi from 'api/alerts/testAlert';
import logEvent from 'api/common/logEvent';
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
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { mapQueryDataToApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataToApi';
import { isEqual } from 'lodash-es';
import { BellDot, ExternalLink } from 'lucide-react';
import Tabs2 from 'periscope/components/Tabs2';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import {
	AlertDef,
	defaultEvalWindow,
	defaultMatchType,
} from 'types/api/alerts/def';
import {
	IBuilderQuery,
	Query,
	QueryFunctionProps,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import BasicInfo from './BasicInfo';
import ChartPreview from './ChartPreview';
import QuerySection from './QuerySection';
import RuleOptions from './RuleOptions';
import {
	ActionButton,
	ButtonContainer,
	MainFormContainer,
	StepContainer,
	StepHeading,
} from './styles';
import { getSelectedQueryOptions } from './utils';

export enum AlertDetectionTypes {
	THRESHOLD_ALERT = 'threshold_rule',
	ANOMALY_DETECTION_ALERT = 'anomaly_rule',
}

const ALERT_SETUP_GUIDE_URLS: Record<AlertTypes, string> = {
	[AlertTypes.METRICS_BASED_ALERT]:
		'https://signoz.io/docs/alerts-management/metrics-based-alerts/?utm_source=product&utm_medium=alert-creation-page',
	[AlertTypes.LOGS_BASED_ALERT]:
		'https://signoz.io/docs/alerts-management/log-based-alerts/?utm_source=product&utm_medium=alert-creation-page',
	[AlertTypes.TRACES_BASED_ALERT]:
		'https://signoz.io/docs/alerts-management/trace-based-alerts/?utm_source=product&utm_medium=alert-creation-page',
	[AlertTypes.EXCEPTIONS_BASED_ALERT]:
		'https://signoz.io/docs/alerts-management/exceptions-based-alerts/?utm_source=product&utm_medium=alert-creation-page',
	[AlertTypes.ANOMALY_BASED_ALERT]:
		'https://signoz.io/docs/alerts-management/anomaly-based-alerts/?utm_source=product&utm_medium=alert-creation-page',
};

// eslint-disable-next-line sonarjs/cognitive-complexity
function FormAlertRules({
	alertType,
	formInstance,
	initialValue,
	ruleId,
}: FormAlertRuleProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');
	const { featureFlags } = useAppContext();
	const { safeNavigate } = useSafeNavigate();
	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const urlQuery = useUrlQuery();
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);

	const dataSource = useMemo(
		() => urlQuery.get(QueryParams.alertType) as DataSource,
		[urlQuery],
	);

	// In case of alert the panel types should always be "Graph" only
	const panelType = PANEL_TYPES.TIME_SERIES;

	const {
		currentQuery,
		stagedQuery,
		handleSetQueryData,
		handleRunQuery,
		handleSetConfig,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	useEffect(() => {
		handleSetConfig(panelType || PANEL_TYPES.TIME_SERIES, dataSource);
	}, [handleSetConfig, dataSource, panelType]);

	// use query client
	const ruleCache = useQueryClient();

	const isNewRule = ruleId === 0;

	const [loading, setLoading] = useState(false);
	const [queryStatus, setQueryStatus] = useState<string>('');

	// alertDef holds the form values to be posted
	const [alertDef, setAlertDef] = useState<AlertDef>(initialValue);
	const [yAxisUnit, setYAxisUnit] = useState<string>(currentQuery.unit || '');

	const alertTypeFromURL = urlQuery.get(QueryParams.ruleType);

	const [detectionMethod, setDetectionMethod] = useState<string | null>(null);

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

	const handleDetectionMethodChange = (value: string): void => {
		setAlertDef((def) => ({
			...def,
			ruleType: value,
		}));

		logEvent(`Alert: Detection method changed`, {
			detectionMethod: value,
		});

		setDetectionMethod(value);
	};

	const updateFunctions = (data: IBuilderQuery): QueryFunctionProps[] => {
		const anomalyFunction = {
			name: 'anomaly',
			args: [],
			namedArgs: { z_score_threshold: alertDef.condition.target || 3 },
		};
		const functions = data.functions || [];

		if (alertDef.ruleType === AlertDetectionTypes.ANOMALY_DETECTION_ALERT) {
			// Add anomaly if not already present
			if (!functions.some((func) => func.name === 'anomaly')) {
				functions.push(anomalyFunction);
			} else {
				const anomalyFuncIndex = functions.findIndex(
					(func) => func.name === 'anomaly',
				);

				if (anomalyFuncIndex !== -1) {
					const anomalyFunc = {
						...functions[anomalyFuncIndex],
						namedArgs: { z_score_threshold: alertDef.condition.target || 3 },
					};
					functions.splice(anomalyFuncIndex, 1);
					functions.push(anomalyFunc);
				}
			}
		} else {
			// Remove anomaly if present
			const index = functions.findIndex((func) => func.name === 'anomaly');
			if (index !== -1) {
				functions.splice(index, 1);
			}
		}

		return functions;
	};

	useEffect(() => {
		const ruleType =
			detectionMethod === AlertDetectionTypes.ANOMALY_DETECTION_ALERT
				? AlertDetectionTypes.ANOMALY_DETECTION_ALERT
				: AlertDetectionTypes.THRESHOLD_ALERT;

		queryParams.set(QueryParams.ruleType, ruleType);

		const generatedUrl = `${location.pathname}?${queryParams.toString()}`;

		safeNavigate(generatedUrl);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [detectionMethod]);

	const updateFunctionsBasedOnAlertType = (): void => {
		for (let index = 0; index < currentQuery.builder.queryData.length; index++) {
			const queryData = currentQuery.builder.queryData[index];

			const updatedFunctions = updateFunctions(queryData);
			queryData.functions = updatedFunctions;
			handleSetQueryData(index, queryData);
		}
	};

	useEffect(() => {
		updateFunctionsBasedOnAlertType();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		detectionMethod,
		alertDef.condition.target,
		currentQuery.builder.queryData.length,
	]);

	useEffect(() => {
		const broadcastToSpecificChannels =
			(initialValue &&
				initialValue.preferredChannels &&
				initialValue.preferredChannels.length > 0) ||
			isNewRule;

		let ruleType = AlertDetectionTypes.THRESHOLD_ALERT;

		if (initialValue.ruleType) {
			ruleType = initialValue.ruleType as AlertDetectionTypes;
		} else if (alertTypeFromURL === AlertDetectionTypes.ANOMALY_DETECTION_ALERT) {
			ruleType = AlertDetectionTypes.ANOMALY_DETECTION_ALERT;
		}

		setAlertDef({
			...initialValue,
			broadcastToAll: !broadcastToSpecificChannels,
			ruleType,
		});

		setDetectionMethod(ruleType);
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
		safeNavigate(`${ROUTES.LIST_ALL_ALERT}?${urlQuery.toString()}`);
	}, [safeNavigate, urlQuery]);

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

		if (
			alertDef.ruleType !== AlertDetectionTypes.ANOMALY_DETECTION_ALERT &&
			alertDef.condition?.target !== 0 &&
			!alertDef.condition?.target
		) {
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
			alertType:
				alertType === AlertTypes.ANOMALY_BASED_ALERT
					? AlertTypes.METRICS_BASED_ALERT
					: alertType,
			source: window?.location.toString(),
			ruleType:
				currentQuery.queryType === EQueryType.PROM
					? 'promql_rule'
					: alertDef.ruleType,
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

		if (alertDef.ruleType === AlertDetectionTypes.ANOMALY_DETECTION_ALERT) {
			postableAlert.condition.algorithm = alertDef.condition.algorithm;
			postableAlert.condition.seasonality = alertDef.condition.seasonality;
		}

		return postableAlert;
	};

	const memoizedPreparePostData = useCallback(preparePostData, [
		currentQuery,
		alertDef,
		alertType,
		initQuery,
		panelType,
	]);

	const isAlertAvailable =
		!featureFlags?.find((flag) => flag.name === FeatureKeys.QUERY_BUILDER_ALERTS)
			?.active || false;

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
					safeNavigate(`${ROUTES.LIST_ALL_ALERT}?${urlQuery.toString()}`);
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
			ruleType: postableAlert?.ruleType,
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
			ruleType: postableAlert.ruleType,
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

	function handleRedirection(option: AlertTypes): void {
		let url;
		if (
			option === AlertTypes.METRICS_BASED_ALERT &&
			alertTypeFromURL === AlertDetectionTypes.ANOMALY_DETECTION_ALERT
		) {
			url = ALERT_SETUP_GUIDE_URLS[AlertTypes.ANOMALY_BASED_ALERT];
		} else {
			url = ALERT_SETUP_GUIDE_URLS[option];
		}

		if (url) {
			logEvent('Alert: Check example alert clicked', {
				dataSource: ALERTS_DATA_SOURCE_MAP[alertDef?.alertType as AlertTypes],
				isNewRule: !ruleId || ruleId === 0,
				ruleId,
				queryType: currentQuery.queryType,
				link: url,
			});
			window.open(url, '_blank');
		}
	}

	useEffect(() => {
		if (!isRuleCreated) {
			logEvent('Alert: Edit page visited', {
				ruleId,
				dataSource: ALERTS_DATA_SOURCE_MAP[alertType as AlertTypes],
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const tabs = [
		{
			value: AlertDetectionTypes.THRESHOLD_ALERT,
			label: 'Threshold Alert',
		},
		{
			value: AlertDetectionTypes.ANOMALY_DETECTION_ALERT,
			label: 'Anomaly Detection Alert',
			isBeta: true,
		},
	];

	const isAnomalyDetectionEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.ANOMALY_DETECTION)
			?.active || false;

	return (
		<>
			{Element}

			<div id="top">
				<div className="overview-header">
					<div className="alert-type-container">
						{isNewRule && (
							<Typography.Title level={5} className="alert-type-title">
								<BellDot size={14} />

								{alertDef.alertType === AlertTypes.ANOMALY_BASED_ALERT &&
									'Anomaly Detection Alert'}
								{alertDef.alertType === AlertTypes.METRICS_BASED_ALERT &&
									'Metrics Based Alert'}
								{alertDef.alertType === AlertTypes.LOGS_BASED_ALERT &&
									'Logs Based Alert'}
								{alertDef.alertType === AlertTypes.TRACES_BASED_ALERT &&
									'Traces Based Alert'}
								{alertDef.alertType === AlertTypes.EXCEPTIONS_BASED_ALERT &&
									'Exceptions Based Alert'}
							</Typography.Title>
						)}
					</div>

					<Button
						className="periscope-btn"
						onClick={(): void => handleRedirection(alertDef.alertType as AlertTypes)}
						icon={<ExternalLink size={14} />}
					>
						Alert Setup Guide
					</Button>
				</div>

				<MainFormContainer
					initialValues={initialValue}
					layout="vertical"
					form={formInstance}
					className="main-container"
				>
					<div className="chart-preview-container">
						{currentQuery.queryType === EQueryType.QUERY_BUILDER &&
							renderQBChartPreview()}
						{currentQuery.queryType === EQueryType.PROM &&
							renderPromAndChQueryChartPreview()}
						{currentQuery.queryType === EQueryType.CLICKHOUSE &&
							renderPromAndChQueryChartPreview()}
					</div>

					<StepContainer>
						<BuilderUnitsFilter
							onChange={onUnitChangeHandler}
							yAxisUnit={yAxisUnit}
						/>
					</StepContainer>

					<div className="steps-container">
						{alertDef.alertType === AlertTypes.METRICS_BASED_ALERT &&
							isAnomalyDetectionEnabled && (
								<div className="detection-method-container">
									<StepHeading> {t('alert_form_step1')}</StepHeading>

									<Tabs2
										key={detectionMethod}
										tabs={tabs}
										initialSelectedTab={detectionMethod || ''}
										onSelectTab={handleDetectionMethodChange}
									/>

									<div className="detection-method-description">
										{detectionMethod === AlertDetectionTypes.ANOMALY_DETECTION_ALERT
											? t('anomaly_detection_alert_desc')
											: t('threshold_alert_desc')}
									</div>
								</div>
							)}

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
					</div>
					<ButtonContainer>
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
			</div>
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
