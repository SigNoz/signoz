import './IntegrationDetailPage.styles.scss';

import { Button } from 'antd';
import { useGetIntegration } from 'hooks/Integrations/useGetIntegration';
import { defaultTo } from 'lodash-es';
import { ArrowLeft } from 'lucide-react';

import IntegrationDetailContent from './IntegrationDetailContent';
import IntegrationDetailHeader from './IntegrationDetailHeader';
import IntergrationsUninstallBar from './IntegrationsUninstallBar';
import { ConnectionStates } from './TestConnection';
import { getConnectionStatesFromConnectionStatus } from './utils';

interface IntegrationDetailPageProps {
	selectedIntegration: string;
	setSelectedIntegration: (id: string | null) => void;
	activeDetailTab: string;
}

function IntegrationDetailPage(props: IntegrationDetailPageProps): JSX.Element {
	const { selectedIntegration, setSelectedIntegration, activeDetailTab } = props;

	const { data, isLoading, isFetching, refetch } = useGetIntegration({
		integrationId: selectedIntegration,
	});

	console.log(data);
	const loading = isLoading || isFetching;
	const integrationData = data?.data.data;
	return (
		<div className="integration-detail-content">
			<Button
				type="text"
				icon={<ArrowLeft size={14} />}
				className="all-integrations-btn"
				onClick={(): void => {
					setSelectedIntegration(null);
				}}
			>
				All Integrations
			</Button>

			{loading ? (
				<div className="loading-integration-details">
					Please wait.. While we load the integration details
				</div>
			) : (
				integrationData && (
					<>
						<IntegrationDetailHeader
							id={selectedIntegration}
							title={defaultTo(integrationData?.title, '')}
							description={defaultTo(integrationData?.description, '')}
							icon={defaultTo(integrationData?.icon, '')}
							connectionStatus={integrationData?.connection_status}
							refetchIntegrationDetails={refetch}
						/>
						<IntegrationDetailContent
							activeDetailTab={activeDetailTab}
							integrationData={integrationData}
						/>

						{getConnectionStatesFromConnectionStatus(
							integrationData.connection_status,
						) !== ConnectionStates.NotInstalled && (
							<IntergrationsUninstallBar
								integrationTitle={defaultTo(integrationData?.title, '')}
								integrationId={selectedIntegration}
								refetchIntegrationDetails={refetch}
							/>
						)}
					</>
				)
			)}
		</div>
	);
}

export default IntegrationDetailPage;
