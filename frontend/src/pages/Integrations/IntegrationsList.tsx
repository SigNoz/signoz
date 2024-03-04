import './Integrations.styles.scss';

import { Button, List, Typography } from 'antd';
import { useGetAllIntegrations } from 'hooks/Integrations/useGetAllIntegrations';
import { useMemo } from 'react';

interface IntegrationsListProps {
	setSelectedIntegration: (id: string) => void;
	searchTerm: string;
}

function IntegrationsList(props: IntegrationsListProps): JSX.Element {
	const { setSelectedIntegration, searchTerm } = props;

	const { data, isFetching, isLoading } = useGetAllIntegrations();

	const filteredDataList = useMemo(() => {
		if (data?.data.data.integrations) {
			return data?.data.data.integrations.filter((item) =>
				item.title.toLowerCase().includes(searchTerm.toLowerCase()),
			);
		}
		return [];
	}, [data?.data.data.integrations, searchTerm]);

	return (
		<div className="integrations-list">
			<List
				dataSource={filteredDataList}
				loading={isFetching || isLoading}
				itemLayout="horizontal"
				renderItem={(item): JSX.Element => (
					<List.Item key={item.id} className="integrations-list-item">
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
							onClick={(): void => setSelectedIntegration(item.id)}
						>
							Configure
						</Button>
					</List.Item>
				)}
			/>
		</div>
	);
}

export default IntegrationsList;
