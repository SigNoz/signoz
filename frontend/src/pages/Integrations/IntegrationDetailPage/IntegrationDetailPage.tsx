import './IntegrationDetailPage.styles.scss';

import { Button } from 'antd';
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
			<IntegrationDetailHeader
				id={selectedIntegration}
				title="Redis"
				description="Redis is an open source (BSD licensed), in-memory data structure store, used as a database, cache, and message broker."
				icon="/Icons/redis-logo.svg"
			/>
			<IntegrationDetailContent activeDetailTab={activeDetailTab} />

			<IntergrationsUninstallBar integrationTitle="Redis" />
		</div>
	);
}

export default IntegrationDetailPage;
