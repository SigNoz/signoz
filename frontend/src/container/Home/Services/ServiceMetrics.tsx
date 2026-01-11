import { Button, Select, Skeleton, Table } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import { useQueryService } from 'hooks/useQueryService';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import history from 'lib/history';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { useAppContext } from 'providers/App/App';
import { IUser } from 'providers/App/types';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AppState } from 'store/reducers';
import {
	LicensePlatform,
	LicenseResModel,
} from 'types/api/licensesV3/getActive';
import { ServicesList } from 'types/api/metrics/getService';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';
import { USER_ROLES } from 'types/roles';

import { DOCS_LINKS } from '../constants';
import { columns, TIME_PICKER_OPTIONS } from './constants';

const homeInterval = 30 * 60 * 1000;

// Extracted EmptyState component
const EmptyState = memo(
	({
		user,
		activeLicenseV3,
	}: {
		user: IUser;
		activeLicenseV3: LicenseResModel | null;
	}): JSX.Element => (
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
									source: 'Service Metrics',
								});

								if (
									activeLicenseV3 &&
									activeLicenseV3.platform === LicensePlatform.CLOUD
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
									source: 'Service Metrics',
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
);
EmptyState.displayName = 'EmptyState';

// Extracted ServicesList component
const ServicesListTable = memo(
	({
		services,
		onRowClick,
	}: {
		services: ServicesList[];
		onRowClick: (record: ServicesList) => void;
	}): JSX.Element => (
		<div className="services-list-container home-data-item-container metrics-services-list">
			<div className="services-list">
				<Table<ServicesList>
					columns={columns}
					dataSource={services}
					pagination={false}
					className="services-table"
					onRow={(record): { onClick: () => void } => ({
						onClick: (): void => onRowClick(record),
					})}
				/>
			</div>
		</div>
	),
);
ServicesListTable.displayName = 'ServicesListTable';

function ServiceMetrics({
	onUpdateChecklistDoneItem,
	loadingUserPreferences,
}: {
	onUpdateChecklistDoneItem: (itemKey: string) => void;
	loadingUserPreferences: boolean;
}): JSX.Element {
	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { user, activeLicense } = useAppContext();

	const [timeRange, setTimeRange] = useState(() => {
		const now = new Date().getTime();
		return {
			startTime: now - homeInterval,
			endTime: now,
			selectedInterval: homeInterval,
		};
	});

	const { queries } = useResourceAttribute();
	const { safeNavigate } = useSafeNavigate();

	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	const handleTimeIntervalChange = useCallback((value: number): void => {
		const timeInterval = TIME_PICKER_OPTIONS.find(
			(option) => option.value === value,
		);

		logEvent('Homepage: Services time interval updated', {
			updatedTimeInterval: timeInterval?.label,
		});

		const now = new Date();
		setTimeRange({
			startTime: now.getTime() - value,
			endTime: now.getTime(),
			selectedInterval: value,
		});
	}, []);

	// Fetch services data from /api/v2/services
	const { data: servicesData, isLoading, isError } = useQueryService({
		minTime: timeRange.startTime * 1e6, // Convert ms to nanoseconds
		maxTime: timeRange.endTime * 1e6, // Convert ms to nanoseconds
		selectedTime: globalSelectedInterval,
		selectedTags,
		options: {
			keepPreviousData: true,
			refetchOnMount: false,
		},
	});

	const services: ServicesList[] = useMemo(() => servicesData || [], [
		servicesData,
	]);

	const sortedServices = useMemo(
		() =>
			services?.sort(
				(a, b) =>
					// p99 is already a number (nanoseconds), sort descending
					b.p99 - a.p99,
			) || [],
		[services],
	);

	const servicesExist = sortedServices.length > 0;
	const top5Services = useMemo(() => sortedServices.slice(0, 5), [
		sortedServices,
	]);

	useEffect(() => {
		if (!loadingUserPreferences && servicesExist) {
			onUpdateChecklistDoneItem('SETUP_SERVICES');
		}
	}, [onUpdateChecklistDoneItem, loadingUserPreferences, servicesExist]);

	const handleRowClick = useCallback(
		(record: ServicesList) => {
			logEvent('Homepage: Service clicked', {
				serviceName: record.serviceName,
			});
			safeNavigate(`${ROUTES.APPLICATION}/${record.serviceName}`);
		},
		[safeNavigate],
	);

	if (isLoading) {
		return (
			<Card className="services-list-card home-data-card loading-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

	if (isError) {
		return (
			<Card className="services-list-card home-data-card error-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

	return (
		<Card className="services-list-card home-data-card">
			{servicesExist && (
				<Card.Header>
					<div className="services-header home-data-card-header">
						{' '}
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
				{servicesExist ? (
					<ServicesListTable services={top5Services} onRowClick={handleRowClick} />
				) : (
					<EmptyState user={user} activeLicenseV3={activeLicense} />
				)}
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

export default memo(ServiceMetrics);
