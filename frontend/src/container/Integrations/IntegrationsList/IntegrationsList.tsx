import { useMemo } from 'react';
import { Badge } from '@signozhq/badge';
import { Color } from '@signozhq/design-tokens';
import { Button, Skeleton, Typography } from 'antd';
import { useGetAllIntegrations } from 'hooks/Integrations/useGetAllIntegrations';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { MoveUpRight, RotateCw } from 'lucide-react';
import { IntegrationsProps } from 'types/api/integrations/types';

import { handleContactSupport } from '../utils';

import './IntegrationsList.styles.scss';

interface IntegrationsListProps {
	setSelectedIntegration: (integration: IntegrationsProps) => void;
}

function IntegrationsList(props: IntegrationsListProps): JSX.Element {
	const { setSelectedIntegration } = props;

	const {
		data,
		isFetching,
		isLoading,
		isRefetching,
		isError,
		refetch,
	} = useGetAllIntegrations();

	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const integrationsList = useMemo(() => {
		if (data?.data.data.integrations) {
			return data.data.data.integrations;
		}

		return [];
	}, [data?.data.data.integrations]);

	const loading = isLoading || isFetching || isRefetching;

	const handleSelectedIntegration = (integration: IntegrationsProps): void => {
		setSelectedIntegration(integration);
	};

	const renderError = (): JSX.Element => {
		return (
			<div className="error-container">
				<div className="error-content">
					<img
						src="/Icons/awwSnap.svg"
						alt="error-emoji"
						className="error-state-svg"
					/>
					<Typography.Text>
						Something went wrong :/ Please retry or contact support.
					</Typography.Text>
					<div className="error-btns">
						<Button
							type="primary"
							className="retry-btn"
							onClick={(): Promise<any> => refetch()}
							icon={<RotateCw size={14} />}
						>
							Retry
						</Button>
						<div
							className="contact-support"
							onClick={(): void => handleContactSupport(isCloudUserVal)}
						>
							<Typography.Link className="text">Contact Support </Typography.Link>

							<MoveUpRight size={14} color={Color.BG_ROBIN_400} />
						</div>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="integrations-list-container">
			{!loading && isError && renderError()}

			{loading && (
				<div className="loading-container">
					<Skeleton.Input active size="large" className="skeleton-item" />
					<Skeleton.Input active size="large" className="skeleton-item" />
					<Skeleton.Input active size="large" className="skeleton-item" />
					<Skeleton.Input active size="large" className="skeleton-item" />
					<Skeleton.Input active size="large" className="skeleton-item" />
				</div>
			)}

			{!isError && !loading && (
				<div className="integrations-list">
					<div className="integrations-list-header">
						<div className="integrations-list-header-column title-column">Name</div>
						<div className="integrations-list-header-column published-by-column">
							Published By
						</div>
						<div className="integrations-list-header-column installation-status-column">
							Status
						</div>
					</div>

					{integrationsList.map((integration) => (
						<div
							className="integrations-list-item"
							key={integration.id}
							onClick={(): void => handleSelectedIntegration(integration)}
						>
							<div className="integrations-list-item-column title-column">
								<div className="integrations-list-item-name-image-container">
									<img
										src={integration.icon}
										alt={integration.title}
										className="integrations-list-item-name-image-container-image"
									/>
									<div className="integrations-list-item-name-text">
										{integration.title}
									</div>
								</div>
							</div>
							<div className="integrations-list-item-column">
								<div className="integrations-list-item-published-by">SigNoz</div>
							</div>
							<div className="integrations-list-item-column">
								<div className="integrations-list-item-installation-status">
									<Badge
										color={integration.is_installed ? 'forest' : 'amber'}
										variant="outline"
										capitalize
									>
										{integration.is_installed ? 'Installed' : 'Not Installed'}
									</Badge>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default IntegrationsList;
