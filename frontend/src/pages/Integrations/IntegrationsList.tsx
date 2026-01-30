/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Dispatch, SetStateAction, useMemo } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Button, List, Typography } from 'antd';
import { useGetAllIntegrations } from 'hooks/Integrations/useGetAllIntegrations';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { MoveUpRight, RotateCw } from 'lucide-react';
import { IntegrationsProps } from 'types/api/integrations/types';

import { handleContactSupport, INTEGRATION_TYPES } from './utils';

import './Integrations.styles.scss';

export const AWS_INTEGRATION = {
	id: INTEGRATION_TYPES.AWS_INTEGRATION,
	title: 'Amazon Web Services',
	description: 'One-click setup for AWS monitoring with SigNoz',
	author: {
		name: 'SigNoz',
		email: 'integrations@signoz.io',
		homepage: 'https://signoz.io',
	},
	icon: `Logos/aws-dark.svg`,
	is_installed: false,
	is_new: true,
};

interface IntegrationsListProps {
	setSelectedIntegration: (id: string) => void;
	setActiveDetailTab: Dispatch<SetStateAction<string | null>>;
}

function IntegrationsList(props: IntegrationsListProps): JSX.Element {
	const { setSelectedIntegration, setActiveDetailTab } = props;

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
		const baseList: IntegrationsProps[] = [AWS_INTEGRATION];

		if (data?.data.data.integrations) {
			baseList.push(...data.data.data.integrations);
		}

		return baseList;
	}, [data?.data.data.integrations]);

	const loading = isLoading || isFetching || isRefetching;

	return (
		<div className="integrations-list">
			{!loading && isError && (
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
			)}
			{!isError && (
				<List
					dataSource={integrationsList}
					loading={loading}
					itemLayout="horizontal"
					renderItem={(item): JSX.Element => (
						<List.Item
							key={item.id}
							className="integrations-list-item"
							onClick={(): void => {
								setSelectedIntegration(item.id);
								setActiveDetailTab('overview');
							}}
						>
							<div style={{ display: 'flex', gap: '10px' }}>
								<div className="list-item-image-container">
									<img src={item.icon} alt={item.title} className="list-item-image" />
								</div>
								<div className="list-item-details">
									<Typography.Text className="heading">
										{item.title}
										{item.is_new && <div className="heading__new-tag">NEW</div>}
									</Typography.Text>
									<Typography.Text className="description">
										{item.description}
									</Typography.Text>
								</div>
							</div>
							<Button
								className="configure-btn"
								onClick={(event): void => {
									event.stopPropagation();
									setSelectedIntegration(item.id);
									setActiveDetailTab('configuration');
								}}
							>
								Configure
							</Button>
						</List.Item>
					)}
				/>
			)}
		</div>
	);
}

export default IntegrationsList;
