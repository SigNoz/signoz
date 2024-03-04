import './IntegrationDetailPage.styles.scss';

import { Button } from 'antd';
import { useGetIntegration } from 'hooks/Integrations/useGetIntegration';
import { defaultTo } from 'lodash-es';
import { ArrowLeft } from 'lucide-react';

import IntegrationDetailContent from './IntegrationDetailContent';
import IntegrationDetailHeader from './IntegrationDetailHeader';
import IntergrationsUninstallBar from './IntegrationsUninstallBar';

interface IntegrationDetailPageProps {
	selectedIntegration: string;
	setSelectedIntegration: (id: string | null) => void;
	activeDetailTab: string;
}

function IntegrationDetailPage(props: IntegrationDetailPageProps): JSX.Element {
	const { selectedIntegration, setSelectedIntegration, activeDetailTab } = props;

	const { data, isLoading, isFetching } = useGetIntegration({
		integrationId: selectedIntegration,
	});

	console.log(data);
	const loading = isLoading || isFetching;
	const integrationData = data?.data.data;
	return (
		<div className="integration-detail-content">
			{loading ? (
				<div>Loading </div>
			) : (
				integrationData && (
					<>
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
						<IntegrationDetailHeader
							id={selectedIntegration}
							title={defaultTo(integrationData?.title, '')}
							description={defaultTo(integrationData?.description, '')}
							icon={defaultTo(integrationData?.icon, '')}
						/>
						<IntegrationDetailContent
							activeDetailTab={activeDetailTab}
							integrationData={integrationData}
						/>

						<IntergrationsUninstallBar
							integrationTitle={defaultTo(integrationData?.title, '')}
						/>
					</>
				)
			)}
		</div>
	);
}

export default IntegrationDetailPage;
