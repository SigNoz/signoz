import { useHistory } from 'react-router-dom';
import { Button, Flex, Typography } from 'antd';
import ROUTES from 'constants/routes';
import { ArrowRight } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { routePermission } from 'utils/permission';

import './Integrations.styles.scss';

function Header(): JSX.Element {
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
					Manage a curated list of one-click workspace integrations.
				</Typography.Text>
				{isGetStartedWithCloudAllowed && (
					<Button
						className="periscope-btn primary view-data-sources-btn"
						type="primary"
						onClick={(): void => history.push(ROUTES.GET_STARTED_WITH_CLOUD)}
					>
						<span>View 150+ Data Sources</span>
						<ArrowRight size={14} />
					</Button>
				)}
			</Flex>
		</div>
	);
}

export default Header;
