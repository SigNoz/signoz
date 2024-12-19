/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './Integrations.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, List, Typography } from 'antd';
import { useGetAllIntegrations } from 'hooks/Integrations/useGetAllIntegrations';
import { MoveUpRight, RotateCw } from 'lucide-react';
import { Dispatch, SetStateAction, useMemo } from 'react';
import { isCloudUser } from 'utils/app';

import { handleContactSupport } from './utils';

interface IntegrationsListProps {
	setSelectedIntegration: (id: string) => void;
	setActiveDetailTab: Dispatch<SetStateAction<string | null>>;
	searchTerm: string;
}

function IntegrationsList(props: IntegrationsListProps): JSX.Element {
	const { setSelectedIntegration, searchTerm, setActiveDetailTab } = props;

	const {
		data,
		isFetching,
		isLoading,
		isRefetching,
		isError,
		refetch,
	} = useGetAllIntegrations();

	const filteredDataList = useMemo(() => {
		if (data?.data.data.integrations) {
			return data?.data.data.integrations.filter((item) =>
				item.title.toLowerCase().includes(searchTerm.toLowerCase()),
			);
		}
		return [];
	}, [data?.data.data.integrations, searchTerm]);

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
								onClick={(): void => handleContactSupport(isCloudUser())}
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
					dataSource={filteredDataList}
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
									<Typography.Text className="heading">{item.title}</Typography.Text>
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
