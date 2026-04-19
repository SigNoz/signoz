import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Breadcrumb, Button, Divider } from 'antd';
import logEvent from 'api/common/logEvent';
import classNames from 'classnames';
import { Filters } from 'components/AlertDetailsFilters/Filters';
import RouteTab from 'components/RouteTab';
import Spinner from 'components/Spinner';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { CreateAlertProvider } from 'container/CreateAlertV2/context';
import { getCreateAlertLocalStateFromAlertDef } from 'container/CreateAlertV2/utils';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { NEW_ALERT_SCHEMA_VERSION } from 'types/api/alerts/alertTypesV2';
import { fromRuleDTOToPostableRuleV2 } from 'types/api/alerts/convert';
import { isModifierKeyPressed } from 'utils/app';

import AlertHeader from './AlertHeader/AlertHeader';
import AlertNotFound from './AlertNotFound';
import { useGetAlertRuleDetails, useRouteTabUtils } from './hooks';

import './AlertDetails.styles.scss';

function BreadCrumbItem({
	title,
	isLast,
	route,
}: {
	title: string | null;
	isLast?: boolean;
	route?: string;
}): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	if (isLast) {
		return <div className="breadcrumb-item breadcrumb-item--last">{title}</div>;
	}
	const handleNavigate = (e: React.MouseEvent): void => {
		if (!route) {
			return;
		}
		safeNavigate(ROUTES.LIST_ALL_ALERT, { newTab: isModifierKeyPressed(e) });
	};

	return (
		<Button type="text" className="breadcrumb-item" onClick={handleNavigate}>
			{title}
		</Button>
	);
}

BreadCrumbItem.defaultProps = {
	isLast: false,
	route: '',
};

function AlertDetails(): JSX.Element {
	const { pathname } = useLocation();
	const { routes } = useRouteTabUtils();
	const params = useUrlQuery();

	const {
		isLoading,
		isError,
		ruleId,
		isValidRuleId,
		alertDetailsResponse,
	} = useGetAlertRuleDetails();

	const isTestAlert = useMemo(() => {
		return params.get(QueryParams.isTestAlert) === 'true';
	}, [params]);

	const getDocumentTitle = useMemo(() => {
		const alertTitle = alertDetailsResponse?.data?.alert;
		if (alertTitle) {
			return alertTitle;
		}
		if (isTestAlert) {
			return 'Test Alert';
		}
		if (isLoading) {
			return document.title;
		}
		return 'Alert Not Found';
	}, [alertDetailsResponse?.data?.alert, isTestAlert, isLoading]);

	useEffect(() => {
		document.title = getDocumentTitle;
	}, [getDocumentTitle]);

	const alertRuleDetails = useMemo(
		() =>
			alertDetailsResponse?.data
				? fromRuleDTOToPostableRuleV2(alertDetailsResponse.data)
				: undefined,
		[alertDetailsResponse],
	);

	const initialAlertState = useMemo(
		() => getCreateAlertLocalStateFromAlertDef(alertRuleDetails),
		[alertRuleDetails],
	);

	if (isError || !isValidRuleId || (!isLoading && !alertRuleDetails)) {
		return <AlertNotFound isTestAlert={isTestAlert} />;
	}

	const handleTabChange = (route: string): void => {
		if (route === ROUTES.ALERT_HISTORY) {
			logEvent('Alert History tab: Visited', { ruleId });
		}
	};

	const isV2Alert = alertRuleDetails?.schemaVersion === NEW_ALERT_SCHEMA_VERSION;

	// Show spinner until we have alert data loaded
	if (isLoading && !alertRuleDetails) {
		return <Spinner />;
	}

	return (
		<CreateAlertProvider
			ruleId={ruleId || ''}
			isEditMode
			initialAlertType={alertRuleDetails?.alertType as AlertTypes}
			initialAlertState={initialAlertState}
		>
			<div
				className={classNames('alert-details', { 'alert-details-v2': isV2Alert })}
			>
				<Breadcrumb
					className="alert-details__breadcrumb"
					items={[
						{
							title: (
								<BreadCrumbItem title="Alert Rules" route={ROUTES.LIST_ALL_ALERT} />
							),
						},
						{
							title: <BreadCrumbItem title={ruleId} isLast />,
						},
					]}
				/>
				<Divider className="divider breadcrumb-divider" />

				{alertRuleDetails && <AlertHeader alertDetails={alertRuleDetails} />}
				<Divider className="divider" />
				<div className="tabs-and-filters">
					<RouteTab
						routes={routes}
						activeKey={pathname}
						history={history}
						onChangeHandler={handleTabChange}
						tabBarExtraContent={<Filters />}
					/>
				</div>
			</div>
		</CreateAlertProvider>
	);
}

export default AlertDetails;
