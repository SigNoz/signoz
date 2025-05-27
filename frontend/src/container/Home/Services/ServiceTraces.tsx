import { Button, Select, Skeleton, Table } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import { useQueryService } from 'hooks/useQueryService';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import history from 'lib/history';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { LicensePlatform } from 'types/api/licensesV3/getActive';
import { ServicesList } from 'types/api/metrics/getService';
import { GlobalReducer } from 'types/reducer/globalTime';
import { USER_ROLES } from 'types/roles';

import { DOCS_LINKS } from '../constants';
import { columns, TIME_PICKER_OPTIONS } from './constants';

const homeInterval = 30 * 60 * 1000;

export default function ServiceTraces({
	onUpdateChecklistDoneItem,
	loadingUserPreferences,
}: {
	onUpdateChecklistDoneItem: (itemKey: string) => void;
	loadingUserPreferences: boolean;
}): JSX.Element {
	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { user, activeLicense } = useAppContext();

	const now = new Date().getTime();
	const [timeRange, setTimeRange] = useState({
		startTime: now - homeInterval,
		endTime: now,
		selectedInterval: homeInterval,
	});

	const { safeNavigate } = useSafeNavigate();

	// Fetch Services
	const {
		data: services,
		isLoading: isServicesLoading,
		isFetching: isServicesFetching,
		isError: isServicesError,
	} = useQueryService({
		minTime: timeRange.startTime * 1e6,
		maxTime: timeRange.endTime * 1e6,
		selectedTime,
		selectedTags: [],
		options: {
			enabled: true,
		},
	});

	const sortedServices = useMemo(
		() => services?.sort((a, b) => b.p99 - a.p99) || [],
		[services],
	);

	const servicesExist = useMemo(() => sortedServices.length > 0, [
		sortedServices,
	]);
	const top5Services = useMemo(() => sortedServices.slice(0, 5), [
		sortedServices,
	]);

	useEffect(() => {
		if (servicesExist && !loadingUserPreferences) {
			onUpdateChecklistDoneItem('SETUP_SERVICES');
		}
	}, [servicesExist, onUpdateChecklistDoneItem, loadingUserPreferences]);

	const handleTimeIntervalChange = useCallback((value: number): void => {
		const now = new Date();

		const timeInterval = TIME_PICKER_OPTIONS.find(
			(option) => option.value === value,
		);

		logEvent('Homepage: Services time interval updated', {
			updatedTimeInterval: timeInterval?.label,
		});

		setTimeRange({
			startTime: now.getTime() - value,
			endTime: now.getTime(),
			selectedInterval: value,
		});
	}, []);

	const emptyStateCard = useMemo(
		() => (
			<div className="empty-state-container">
				<div className="empty-state-content-container">
					<div className="empty-state-content">
						<img
							src="/Icons/triangle-ruler.svg"
							alt="empty-alert-icon"
							className="empty-state-icon"
						/>

						<div className="empty-title">You are not sending traces yet.</div>

						<div className="empty-description">
							Start sending traces to see your services.
						</div>
					</div>

					{user?.role !== USER_ROLES.VIEWER && (
						<div className="empty-actions-container">
							<Button
								type="default"
								className="periscope-btn secondary"
								onClick={(): void => {
									logEvent('Homepage: Get Started clicked', {
										source: 'Service Traces',
									});

									if (
										activeLicense &&
										activeLicense.platform === LicensePlatform.CLOUD
									) {
										history.push(ROUTES.GET_STARTED_WITH_CLOUD);
									} else {
										window?.open(
											DOCS_LINKS.ADD_DATA_SOURCE,
											'_blank',
											'noopener noreferrer',
										);
									}
								}}
							>
								Get Started &nbsp; <ArrowRight size={16} />
							</Button>

							<Button
								type="link"
								className="learn-more-link"
								onClick={(): void => {
									logEvent('Homepage: Learn more clicked', {
										source: 'Service Traces',
									});
									window.open(
										'https://signoz.io/docs/instrumentation/overview/',
										'_blank',
									);
								}}
							>
								Learn more <ArrowUpRight size={12} />
							</Button>
						</div>
					)}
				</div>
			</div>
		),
		[user?.role, activeLicense],
	);

	const renderDashboardsList = useCallback(
		() => (
			<div className="services-list-container home-data-item-container traces-services-list">
				<div className="services-list">
					<Table<ServicesList>
						columns={columns}
						dataSource={top5Services}
						pagination={false}
						className="services-table"
						onRow={(record): { onClick: () => void } => ({
							onClick: (): void => {
								logEvent('Homepage: Service clicked', {
									serviceName: record.serviceName,
								});

								safeNavigate(`${ROUTES.APPLICATION}/${record.serviceName}`);
							},
						})}
					/>
				</div>
			</div>
		),
		[top5Services, safeNavigate],
	);

	if (isServicesLoading || isServicesFetching) {
		return (
			<Card className="dashboards-list-card home-data-card loading-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

	if (isServicesError) {
		return (
			<Card className="dashboards-list-card home-data-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

	return (
		<Card className="dashboards-list-card home-data-card">
			{servicesExist && (
				<Card.Header>
					<div className="services-header home-data-card-header">
						Services
						<div className="services-header-actions">
							<Select
								value={timeRange.selectedInterval}
								onChange={handleTimeIntervalChange}
								options={TIME_PICKER_OPTIONS}
								className="services-header-select"
							/>
						</div>
					</div>
				</Card.Header>
			)}
			<Card.Content>
				{servicesExist ? renderDashboardsList() : emptyStateCard}
			</Card.Content>

			{servicesExist && (
				<Card.Footer>
					<div className="services-footer home-data-card-footer">
						<Link to="/services">
							<Button
								type="link"
								className="periscope-btn link learn-more-link"
								onClick={(): void => {
									logEvent('Homepage: All Services clicked', {});
								}}
							>
								All Services <ArrowRight size={12} />
							</Button>
						</Link>
					</div>
				</Card.Footer>
			)}
		</Card>
	);
}
