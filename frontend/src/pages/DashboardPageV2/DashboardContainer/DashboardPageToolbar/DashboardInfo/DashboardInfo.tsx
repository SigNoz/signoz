import { KeyboardEvent } from 'react';
import {
	Check,
	Globe,
	LockKeyhole,
	LockKeyholeOpen,
	SolidInfoCircle,
	X,
} from '@signozhq/icons';
import TagBadge from 'components/TagBadge/TagBadge';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { isEmpty } from 'lodash-es';
import { linkifyText } from 'utils/linkifyText';
import { openInNewTab } from 'utils/navigation';

import styles from './DashboardInfo.module.scss';
import { useVisibleTagCount } from './useVisibleTagCount';
import { DASHBOARD_NAME_MAX_LENGTH } from '../../constants';
import { useDashboardStore } from '../../store/useDashboardStore';

interface DashboardInfoProps {
	title: string;
	image: string;
	tags: string[];
	description: string;
	isPublicDashboard: boolean;
	/** Absolute URL of the public dashboard page; opened when the globe is clicked. */
	publicUrl: string;
	isDashboardLocked: boolean;
	/** Whether to render the lock toggle at all (hidden for never-locked dashboards). */
	showLockToggle: boolean;
	/** When provided, the lock icon toggles lock/unlock (author/admin only). */
	onToggleLock?: () => void;
	isEditing: boolean;
	draft: string;
	onDraftChange: (value: string) => void;
	onStartEdit: () => void;
	onCommit: () => void;
	onCancel: () => void;
}

function DashboardInfo({
	title,
	image,
	tags,
	description,
	isPublicDashboard,
	publicUrl,
	isDashboardLocked,
	showLockToggle,
	onToggleLock,
	isEditing,
	draft,
	onDraftChange,
	onStartEdit,
	onCommit,
	onCancel,
}: DashboardInfoProps): JSX.Element {
	const canEdit = useDashboardStore((s) => s.isEditable);

	const hasTags = tags.length > 0;
	const hasDescription = !isEmpty(description);

	const { containerRef, visibleCount } = useVisibleTagCount(tags);
	const needsOverflow = tags.length > visibleCount;
	const visibleTags = needsOverflow ? tags.slice(0, visibleCount) : tags;
	const remainingTags = needsOverflow ? tags.slice(visibleCount) : [];

	let lockTooltip: string;
	if (onToggleLock) {
		lockTooltip = isDashboardLocked
			? 'Locked — click to unlock'
			: 'Unlocked — click to lock';
	} else {
		lockTooltip = isDashboardLocked
			? 'This dashboard is locked'
			: 'This dashboard is unlocked';
	}

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			onCommit();
		} else if (event.key === 'Escape') {
			onCancel();
		}
	};

	return (
		<div className={styles.dashboardInfo}>
			<img src={image} alt={title} className={styles.dashboardImage} />

			{isEditing ? (
				<div className={styles.dashboardTitleEditor}>
					<Input
						autoFocus
						value={draft}
						testId="dashboard-title-input"
						maxLength={DASHBOARD_NAME_MAX_LENGTH}
						className={styles.dashboardTitleInput}
						onChange={(e): void => onDraftChange(e.target.value)}
						onKeyDown={onKeyDown}
					/>
					<Button
						type="button"
						variant="outlined"
						color="primary"
						size="icon"
						className={styles.dashboardTitleActionButton}
						aria-label="Save title"
						testId="dashboard-title-save"
						onClick={onCommit}
					>
						<Check size={14} />
					</Button>
					<Button
						type="button"
						variant="outlined"
						color="secondary"
						size="icon"
						className={styles.dashboardTitleActionButton}
						aria-label="Cancel title edit"
						testId="dashboard-title-cancel"
						onClick={onCancel}
					>
						<X size={14} />
					</Button>
				</div>
			) : (
				<TooltipSimple title={title} disableHoverableContent>
					<Typography.Text
						className={cx(styles.dashboardTitle, {
							[styles.dashboardTitleHover]: canEdit,
						})}
						data-testid="dashboard-title"
						onClick={canEdit ? onStartEdit : undefined}
					>
						{title}
					</Typography.Text>
				</TooltipSimple>
			)}

			{hasDescription && (
				<TooltipSimple
					side="bottom"
					title={
						<span className={styles.descriptionTooltip}>
							{linkifyText(description)}
						</span>
					}
				>
					<SolidInfoCircle
						className={styles.descriptionIcon}
						size={14}
						data-testid="dashboard-description-info"
					/>
				</TooltipSimple>
			)}

			{isPublicDashboard && (
				<TooltipSimple
					title="This dashboard is publicly accessible. Click to open the public page."
					disableHoverableContent
				>
					<Button
						type="button"
						variant="ghost"
						color="secondary"
						size="icon"
						className={styles.publicLink}
						aria-label="Open public dashboard"
						testId="dashboard-public-link"
						onClick={(): void => openInNewTab(publicUrl)}
					>
						<Globe size={14} />
					</Button>
				</TooltipSimple>
			)}

			{showLockToggle && (
				<TooltipSimple title={lockTooltip} disableHoverableContent>
					<Button
						type="button"
						variant="ghost"
						color="secondary"
						size="icon"
						className={styles.lockButton}
						aria-label={isDashboardLocked ? 'Unlock dashboard' : 'Lock dashboard'}
						testId="dashboard-lock"
						disabled={!onToggleLock}
						onClick={onToggleLock}
					>
						{isDashboardLocked ? (
							<LockKeyhole size={14} />
						) : (
							<LockKeyholeOpen size={14} />
						)}
					</Button>
				</TooltipSimple>
			)}

			{hasTags && (
				<>
					<span className={styles.divider} />
					<div
						ref={containerRef}
						className={styles.dashboardTags}
						data-testid="dashboard-tags"
					>
						{visibleTags.map((tag) => (
							<TagBadge key={tag}>{tag}</TagBadge>
						))}
						{remainingTags.length > 0 && (
							<TooltipSimple title={remainingTags.join(', ')}>
								<span data-testid="dashboard-tags-overflow">
									<TagBadge>+{remainingTags.length}</TagBadge>
								</span>
							</TooltipSimple>
						)}
					</div>
				</>
			)}
		</div>
	);
}

export default DashboardInfo;
