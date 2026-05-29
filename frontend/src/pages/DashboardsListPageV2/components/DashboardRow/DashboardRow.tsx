import { Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { Badge } from '@signozhq/ui/badge';
import { CalendarClock } from '@signozhq/icons';
import logEvent from 'api/common/logEvent';
import { generatePath } from 'react-router-dom';
import { Base64Icons } from 'container/DashboardContainer/DashboardSettings/General/utils';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useTimezone } from 'providers/Timezone';
import { isModifierKeyPressed } from 'utils/app';

import type { DashboardListItem } from '../../utils';
import { lastUpdatedLabel, tagsToStrings } from '../../utils';
import ActionsPopover from '../ActionsPopover/ActionsPopover';

import styles from './DashboardRow.module.scss';

interface Props {
	dashboard: DashboardListItem;
	index: number;
	canAct: boolean;
	showUpdatedAt: boolean;
	showUpdatedBy: boolean;
}

function DashboardRow({
	dashboard,
	index,
	canAct,
	showUpdatedAt,
	showUpdatedBy,
}: Props): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const id = dashboard.id;
	const name = dashboard.spec?.display?.name ?? '';
	const image = dashboard.image || Base64Icons[0];
	const createdBy = dashboard.createdBy ?? '';
	const updatedBy = dashboard.updatedBy ?? '';
	const createdAt = dashboard.createdAt ?? '';
	const updatedAt = dashboard.updatedAt ?? '';
	const isLocked = !!dashboard.locked;
	const tags = tagsToStrings(dashboard.tags);

	const link = generatePath(ROUTES.DASHBOARD, { dashboardId: id });
	const formattedCreatedAt = formatTimezoneAdjustedTimestamp(
		createdAt,
		DATE_TIME_FORMATS.DASH_DATETIME_UTC,
	);

	const onClickHandler = (event: React.MouseEvent<HTMLElement>): void => {
		event.stopPropagation();
		safeNavigate(link, { newTab: isModifierKeyPressed(event) });
		logEvent('Dashboard List: Clicked on dashboard', {
			dashboardId: id,
			dashboardName: name,
		});
	};

	return (
		<div className={styles.row} onClick={onClickHandler}>
			<div className={styles.titleWithAction}>
				<div className={styles.titleBlock}>
					<Tooltip
						title={name.length > 50 ? name : ''}
						placement="left"
						overlayClassName="titleTooltipOverlay"
					>
						<div className={styles.titleLink} onClick={onClickHandler}>
							<img src={image} alt="dashboard-image" className={styles.icon} />
							<Typography.Text
								data-testid={`dashboard-title-${index}`}
								className={styles.title}
							>
								{name}
							</Typography.Text>
						</div>
					</Tooltip>
				</div>

				<div className={styles.tagsWithActions}>
					{tags.length > 0 && (
						<div className={styles.tags}>
							{tags.slice(0, 3).map((tag) => (
								<Badge className={styles.tag} key={tag}>
									{tag}
								</Badge>
							))}
							{tags.length > 3 && (
								<Badge className={styles.tag} key={tags[3]}>
									+ <span> {tags.length - 3} </span>
								</Badge>
							)}
						</div>
					)}
				</div>

				{canAct && (
					<ActionsPopover
						link={link}
						dashboardId={id}
						dashboardName={name}
						createdBy={createdBy}
						isLocked={isLocked}
						onView={onClickHandler}
					/>
				)}
			</div>
			<div className={styles.details}>
				<div className={styles.createdAt}>
					<CalendarClock size={14} />
					<Typography.Text>{formattedCreatedAt}</Typography.Text>
				</div>

				{createdBy && (
					<div className={styles.createdBy}>
						<div className={styles.avatar}>
							<Typography.Text className={styles.avatarText}>
								{createdBy.substring(0, 1).toUpperCase()}
							</Typography.Text>
						</div>
						<Typography.Text className={styles.byLabel}>{createdBy}</Typography.Text>
					</div>
				)}

				{showUpdatedAt && (
					<div className={styles.createdAt}>
						<CalendarClock size={14} />
						<Typography.Text>{lastUpdatedLabel(updatedAt)}</Typography.Text>
					</div>
				)}

				{updatedBy && showUpdatedBy && (
					<div className={styles.updatedBy}>
						<Typography.Text className={styles.byLabel}>
							Last Updated By -
						</Typography.Text>
						<div className={styles.avatar}>
							<Typography.Text className={styles.avatarText}>
								{updatedBy.substring(0, 1).toUpperCase()}
							</Typography.Text>
						</div>
						<Typography.Text className={styles.byLabel}>{updatedBy}</Typography.Text>
					</div>
				)}
			</div>
		</div>
	);
}

export default DashboardRow;
