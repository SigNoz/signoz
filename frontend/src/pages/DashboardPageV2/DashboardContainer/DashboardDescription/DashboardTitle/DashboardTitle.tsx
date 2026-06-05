import { Globe, LockKeyhole } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';

import styles from '../DashboardDescription.module.scss';

interface Props {
	title: string;
	image: string;
	isPublicDashboard: boolean;
	isDashboardLocked: boolean;
}

function DashboardTitle({
	title,
	image,
	isPublicDashboard,
	isDashboardLocked,
}: Props): JSX.Element {
	return (
		<div className={styles.leftSection}>
			<img src={image} alt="dashboard-img" className={styles.dashboardImg} />
			<TooltipSimple title={title.length > 30 ? title : ''}>
				<Typography.Text
					className={styles.dashboardTitle}
					data-testid="dashboard-title"
				>
					{title}
				</Typography.Text>
			</TooltipSimple>

			{isPublicDashboard && (
				<TooltipSimple title="This dashboard is publicly accessible">
					<Globe size={14} className={styles.publicDashboardIcon} />
				</TooltipSimple>
			)}

			{isDashboardLocked && (
				<TooltipSimple title="This dashboard is locked">
					<LockKeyhole size={14} />
				</TooltipSimple>
			)}
		</div>
	);
}

export default DashboardTitle;
