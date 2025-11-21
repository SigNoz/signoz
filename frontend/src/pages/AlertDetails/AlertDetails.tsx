import './AlertDetails.styles.scss';

import { Breadcrumb, Button, Divider, Empty } from 'antd';
import logEvent from 'api/common/logEvent';
import classNames from 'classnames';
import { Filters } from 'components/AlertDetailsFilters/Filters';
import RouteTab from 'components/RouteTab';
import Spinner from 'components/Spinner';
import ROUTES from 'constants/routes';
import { CreateAlertProvider } from 'container/CreateAlertV2/context';
import { getCreateAlertLocalStateFromAlertDef } from 'container/CreateAlertV2/utils';
import history from 'lib/history';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import {
	NEW_ALERT_SCHEMA_VERSION,
	PostableAlertRuleV2,
} from 'types/api/alerts/alertTypesV2';

import AlertHeader from './AlertHeader/AlertHeader';
import { useGetAlertRuleDetails, useRouteTabUtils } from './hooks';
import { AlertDetailsStatusRendererProps } from './types';

function AlertDetailsStatusRenderer({
	isLoading,
	isError,
	isRefetching,
	data,
}: AlertDetailsStatusRendererProps): JSX.Element {
	const alertRuleDetails = useMemo(() => data?.payload?.data, [data]);
	const { t } = useTranslation('common');

	if (isLoading || isRefetching) {
		return <Spinner tip="Loading..." />;
	}

	if (isError) {
		return <div>{data?.error || t('something_went_wrong')}</div>;
	}

	return <AlertHeader alertDetails={alertRuleDetails} />;
}

function BreadCrumbItem({
	title,
	isLast,
	route,
}: {
	title: string | null;
	isLast?: boolean;
	route?: string;
}): JSX.Element {
	if (isLast) {
		return <div className="breadcrumb-item breadcrumb-item--last">{title}</div>;
	}
	const handleNavigate = (): void => {
		if (!route) {
			return;
		}
		history.push(ROUTES.LIST_ALL_ALERT);
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
	const { t } = useTranslation(['alerts']);

	const {
		isLoading,
		isRefetching,
		isError,
		ruleId,
		isValidRuleId,
		alertDetailsResponse,
	} = useGetAlertRuleDetails();

	useEffect(() => {
		const alertTitle = alertDetailsResponse?.payload?.data.alert;
		document.title = alertTitle || document.title;
	}, [alertDetailsResponse?.payload?.data.alert, isRefetching]);

	const alertRuleDetails = useMemo(
		() => alertDetailsResponse?.payload?.data as PostableAlertRuleV2 | undefined,
		[alertDetailsResponse],
	);

	const initialAlertState = useMemo(
		() => getCreateAlertLocalStateFromAlertDef(alertRuleDetails),
		[alertRuleDetails],
	);

	if (
		isError ||
		!isValidRuleId ||
		(alertDetailsResponse && alertDetailsResponse.statusCode !== 200)
	) {
		return (
			<div className="alert-empty-card">
				<Empty description={t('alert_rule_not_found')} />
			</div>
		);
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

				<AlertDetailsStatusRenderer
					{...{ isLoading, isError, isRefetching, data: alertDetailsResponse }}
				/>
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
