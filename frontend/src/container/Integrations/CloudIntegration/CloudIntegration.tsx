import { IntegrationType } from 'container/Integrations/types';

import AWSTabs from './AmazonWebServices/ServicesTabs';
import AzureServices from './AzureServices';
import Header from './Header/Header';

import './CloudIntegration.styles.scss';

const CloudIntegration = ({ type }: { type: IntegrationType }): JSX.Element => {
	return (
		<div className="cloud-integration-container">
			<Header title={type} />

			{type === IntegrationType.AWS_SERVICES && <AWSTabs />}
			{type === IntegrationType.AZURE_SERVICES && <AzureServices />}
		</div>
	);
};

export default CloudIntegration;
