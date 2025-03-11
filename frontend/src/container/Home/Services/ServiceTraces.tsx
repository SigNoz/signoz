import { Button, Skeleton, Table } from 'antd';
import ROUTES from 'constants/routes';
import { useQueryService } from 'hooks/useQueryService';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { ServicesList } from 'types/api/metrics/getService';
import { GlobalReducer } from 'types/reducer/globalTime';

import { columns } from './constants';

export default function ServiceTraces({
	onUpdateChecklistDoneItem,
	isWelcomeChecklistSkipped,
}: {
	onUpdateChecklistDoneItem: (itemKey: string) => void;
	isWelcomeChecklistSkipped: boolean;
}): JSX.Element {
	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { safeNavigate } = useSafeNavigate();

	const [servicesList, setServicesList] = useState<ServicesList[]>([]);

	// Fetch Services
	const {
		data: services,
		isLoading: isServicesLoading,
		isFetching: isServicesFetching,
		isError: isServicesError,
	} = useQueryService({
		minTime,
		maxTime,
		selectedTime,
		selectedTags: [],
	});

	useEffect(() => {
		const sortedServices = services?.sort((a, b) => {
			const aUpdateAt = new Date(a.p99).getTime();
			const bUpdateAt = new Date(b.p99).getTime();
			return bUpdateAt - aUpdateAt;
		});

		setServicesList(sortedServices || []);
	}, [services]);

	const servicesExist = servicesList?.length > 0;
	const top5Services = servicesList?.slice(0, 5);

	useEffect(() => {
		if (servicesList.length > 0 && !isWelcomeChecklistSkipped) {
			onUpdateChecklistDoneItem('SETUP_SERVICES');
		}
	}, [servicesList, onUpdateChecklistDoneItem, isWelcomeChecklistSkipped]);

	const emptyStateCard = (): JSX.Element => (
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

				<div className="empty-actions-container">
					<Link to={ROUTES.GET_STARTED}>
						<Button type="default" className="periscope-btn secondary">
							Get Started &nbsp; <ArrowRight size={16} />
						</Button>
					</Link>

					<Button
						type="link"
						className="learn-more-link"
						onClick={(): void => {
							window.open(
								'https://signoz.io/docs/instrumentation/overview/',
								'_blank',
							);
						}}
					>
						Learn more <ArrowUpRight size={12} />
					</Button>
				</div>
			</div>
		</div>
	);

	const renderDashboardsList = (): JSX.Element => (
		<div className="services-list-container home-data-item-container">
			<div className="services-list">
				<Table<ServicesList>
					columns={columns}
					dataSource={top5Services}
					pagination={false}
					className="services-table"
					onRow={(record): { onClick: () => void } => ({
						onClick: (): void => {
							safeNavigate(`${ROUTES.APPLICATION}/${record.serviceName}`);
						},
					})}
				/>
			</div>
		</div>
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
					<div className="services-header home-data-card-header"> Services </div>
				</Card.Header>
			)}
			<Card.Content>
				{servicesExist ? renderDashboardsList() : emptyStateCard()}
			</Card.Content>

			{servicesExist && (
				<Card.Footer>
					<div className="services-footer home-data-card-footer">
						<Link to="/services">
							<Button type="link" className="periscope-btn link learn-more-link">
								All Services <ArrowRight size={12} />
							</Button>
						</Link>
					</div>
				</Card.Footer>
			)}
		</Card>
	);
}
