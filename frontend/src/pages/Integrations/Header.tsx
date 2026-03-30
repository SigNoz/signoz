import { Button, Flex, Typography } from 'antd';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { ArrowRight } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { isModifierKeyPressed } from 'utils/app';
import { routePermission } from 'utils/permission';

import './Integrations.styles.scss';

function Header(): JSX.Element {
	const { user } = useAppContext();
	const { safeNavigate } = useSafeNavigate();

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
						onClick={(e): void =>
							safeNavigate(ROUTES.GET_STARTED_WITH_CLOUD, {
								newTab: isModifierKeyPressed(e),
							})
						}
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
