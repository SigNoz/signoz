import { Color } from '@signozhq/design-tokens';
import { Drawer } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { AlertRuleStats, AlertRuleTopContributors } from 'types/api/alerts/def';

import styles from './ViewAllDrawer.module.scss';
import TopContributorsRows from './TopContributorsRows';

function ViewAllDrawer({
	isViewAllVisible,
	toggleViewAllDrawer,
	totalCurrentTriggers,
	topContributorsData,
}: {
	isViewAllVisible: boolean;
	toggleViewAllDrawer: () => void;
	topContributorsData: AlertRuleTopContributors[];
	totalCurrentTriggers: AlertRuleStats['totalCurrentTriggers'];
}): JSX.Element {
	const isDarkMode = useIsDarkMode();
	return (
		<Drawer
			open={isViewAllVisible}
			destroyOnClose
			onClose={toggleViewAllDrawer}
			placement="right"
			width="50%"
			className={styles.viewAllDrawer}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			title="Viewing All Contributors"
		>
			<div className={styles.topContributorsCardViewAll}>
				<div className={styles.topContributorsCardContent}>
					<TopContributorsRows
						topContributors={topContributorsData}
						totalCurrentTriggers={totalCurrentTriggers}
					/>
				</div>
			</div>
		</Drawer>
	);
}

export default ViewAllDrawer;
