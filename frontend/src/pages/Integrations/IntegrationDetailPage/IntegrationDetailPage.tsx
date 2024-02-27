import './IntegrationDetailPage.styles.scss';

import { Button } from 'antd';
import { ArrowLeft } from 'lucide-react';

import IntegrationDetailContent from './IntegrationDetailContent';
import IntegrationDetailHeader from './IntegrationDetailHeader';

interface IntegrationDetailPageProps {
	selectedIntegration: string;
	setSelectedIntegration: (id: string | null) => void;
}

function IntegrationDetailPage(props: IntegrationDetailPageProps): JSX.Element {
	const { selectedIntegration, setSelectedIntegration } = props;
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

			<IntegrationDetailContent />
		</div>
	);
}

export default IntegrationDetailPage;
