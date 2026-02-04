import { useHistory } from 'react-router-dom';
import { Button } from '@signozhq/button';
import { Input } from '@signozhq/input';
import { Flex, Typography } from 'antd';
import ROUTES from 'constants/routes';
import { ArrowRight, Cable } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { routePermission } from 'utils/permission';

import './IntegrationsHeader.styles.scss';

function IntegrationsHeader(): JSX.Element {
	const history = useHistory();
	const { user } = useAppContext();

	const isGetStartedWithCloudAllowed = routePermission.GET_STARTED_WITH_CLOUD.includes(
		user.role,
	);

	return (
		<div className="integrations-header">
			<Typography.Title className="title">Integrations</Typography.Title>
			<Flex
				justify="space-between"
				align="center"
				className="integrations-header__subrow"
			>
				<Typography.Text className="subtitle">
					Manage integrations for this workspace.
				</Typography.Text>

				{isGetStartedWithCloudAllowed && (
					<Button
						variant="solid"
						color="primary"
						className="view-data-sources-btn"
						onClick={(): void => history.push(ROUTES.GET_STARTED_WITH_CLOUD)}
					>
						<span>View 150+ Data Sources</span>
						<ArrowRight size={14} />
					</Button>
				)}
			</Flex>

			<div className="integrations-search-request-container">
				<Input placeholder="Search for an integration..." />
				<Button
					variant="solid"
					color="secondary"
					className="request-integration-btn"
					prefixIcon={<Cable size={14} />}
					size="sm"
				>
					Request Integration
				</Button>
			</div>
		</div>
	);
}

export default IntegrationsHeader;
