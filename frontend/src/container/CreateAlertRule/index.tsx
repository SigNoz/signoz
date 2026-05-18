import { useCallback, useEffect, useMemo } from 'react';
import { Form, Tabs, TabsProps } from 'antd';
import logEvent from 'api/common/logEvent';
import ConfigureIcon from 'assets/AlertHistory/ConfigureIcon';
import AlertBreadcrumb from 'components/AlertBreadcrumb';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import CreateAlertV2 from 'container/CreateAlertV2';
import FormAlertRules, { AlertDetectionTypes } from 'container/FormAlertRules';
import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { AlertListTabs } from 'pages/AlertList/types';
import { GalleryVerticalEnd, Pyramid } from '@signozhq/icons';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';

import { ALERT_TYPE_VS_SOURCE_MAPPING } from './config';
import { ALERTS_VALUES_MAP, ALERT_TYPE_BREADCRUMB_TITLE } from './defaults';
import SelectAlertType from './SelectAlertType';

import './CreateAlertRule.styles.scss';

function CreateRules(): JSX.Element {
	const [formInstance] = Form.useForm();
	const compositeQuery = useGetCompositeQueryParam();
	const queryParams = useUrlQuery();
	const { safeNavigate } = useSafeNavigate();

	const ruleTypeFromURL = queryParams.get(QueryParams.ruleType);
	const alertTypeFromURL = queryParams.get(QueryParams.alertType);
	const version = queryParams.get(QueryParams.version);
	const showClassicCreateAlertsPageFlag =
		queryParams.get(QueryParams.showClassicCreateAlertsPage) === 'true';

	const isTypeSelectionMode =
		!alertTypeFromURL && !ruleTypeFromURL && !compositeQuery;

	useEffect(() => {
		if (isTypeSelectionMode) {
			logEvent('Alert: New alert data source selection page visited', {});
		}
	}, [isTypeSelectionMode]);

	const alertType = useMemo(() => {
		if (ruleTypeFromURL === AlertDetectionTypes.ANOMALY_DETECTION_ALERT) {
			return AlertTypes.ANOMALY_BASED_ALERT;
		}
		if (!alertTypeFromURL) {
			const dataSource = compositeQuery?.builder.queryData?.[0]?.dataSource;
			if (dataSource) {
				return ALERT_TYPE_VS_SOURCE_MAPPING[dataSource];
			}
			return AlertTypes.METRICS_BASED_ALERT;
		}
		return alertTypeFromURL as AlertTypes;
	}, [alertTypeFromURL, ruleTypeFromURL, compositeQuery?.builder.queryData]);

	const initialAlertValue: AlertDef = useMemo(
		() => ({
			...ALERTS_VALUES_MAP[alertType],
			version: version || ENTITY_VERSION_V5,
		}),
		[alertType, version],
	);

	const handleTabChange = useCallback(
		(tab: string): void => {
			queryParams.set('tab', tab);
			queryParams.delete('subTab');
			queryParams.delete('search');
			safeNavigate(`${ROUTES.LIST_ALL_ALERT}?${queryParams.toString()}`);
		},
		[safeNavigate, queryParams],
	);

	const handleSelectType = useCallback(
		(type: AlertTypes, newTab?: boolean): void => {
			if (type === AlertTypes.ANOMALY_BASED_ALERT) {
				queryParams.set(
					QueryParams.ruleType,
					AlertDetectionTypes.ANOMALY_DETECTION_ALERT,
				);
				queryParams.set(QueryParams.alertType, AlertTypes.METRICS_BASED_ALERT);
			} else {
				queryParams.set(QueryParams.ruleType, AlertDetectionTypes.THRESHOLD_ALERT);
				queryParams.set(QueryParams.alertType, type);
			}

			safeNavigate(`${ROUTES.ALERTS_NEW}?${queryParams.toString()}`, { newTab });
		},
		[queryParams, safeNavigate],
	);

	const alertContent = useMemo(() => {
		if (isTypeSelectionMode) {
			return <SelectAlertType onSelect={handleSelectType} />;
		}

		if (
			showClassicCreateAlertsPageFlag ||
			alertType === AlertTypes.ANOMALY_BASED_ALERT
		) {
			return (
				<FormAlertRules
					alertType={alertType}
					formInstance={formInstance}
					initialValue={initialAlertValue}
					ruleId=""
				/>
			);
		}
		return <CreateAlertV2 alertType={alertType} />;
	}, [
		isTypeSelectionMode,
		handleSelectType,
		showClassicCreateAlertsPageFlag,
		alertType,
		formInstance,
		initialAlertValue,
	]);

	const items: TabsProps['items'] = [
		{
			label: (
				<div className="periscope-tab top-level-tab">
					<GalleryVerticalEnd size={14} />
					Triggered Alerts
				</div>
			),
			key: AlertListTabs.TRIGGERED_ALERTS,
			children: null,
		},
		{
			label: (
				<div className="periscope-tab top-level-tab">
					<Pyramid size={14} />
					Alert Rules
				</div>
			),
			key: AlertListTabs.ALERT_RULES,
			children: (
				<div className="create-alert-wrapper">
					<AlertBreadcrumb
						className="create-alert__breadcrumb"
						items={
							isTypeSelectionMode
								? [
										{
											title: 'Alert Rules',
											route: `${ROUTES.LIST_ALL_ALERT}?tab=${AlertListTabs.ALERT_RULES}`,
										},
										{ title: 'Select Alert Type', isLast: true },
									]
								: [
										{
											title: 'Alert Rules',
											route: `${ROUTES.LIST_ALL_ALERT}?tab=${AlertListTabs.ALERT_RULES}`,
										},
										{ title: 'Select Alert Type', route: ROUTES.ALERTS_NEW },
										{
											title: ALERT_TYPE_BREADCRUMB_TITLE[alertType],
											isLast: true,
										},
									]
						}
					/>
					{alertContent}
				</div>
			),
		},
		{
			label: (
				<div className="periscope-tab top-level-tab">
					<ConfigureIcon width={14} height={14} />
					Configuration
				</div>
			),
			key: AlertListTabs.CONFIGURATION,
			children: null,
		},
	];

	return (
		<Tabs
			destroyInactiveTabPane
			items={items}
			activeKey={AlertListTabs.ALERT_RULES}
			onChange={handleTabChange}
			className="alerts-container create-alert-tabs"
			tabBarExtraContent={
				<div className="create-alert-tabs__extra">
					<DateTimeSelector showAutoRefresh />
					<HeaderRightSection
						enableAnnouncements={false}
						enableShare
						enableFeedback
					/>
				</div>
			}
		/>
	);
}

export default CreateRules;
