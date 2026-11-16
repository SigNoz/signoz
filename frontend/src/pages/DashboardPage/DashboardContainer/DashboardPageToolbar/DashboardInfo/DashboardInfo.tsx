import { type FocusEvent, KeyboardEvent } from 'react';
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
import { toast } from '@signozhq/ui/sonner';
import { Tooltip } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { isEmpty } from 'lodash-es';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';
import CopyButton from 'periscope/components/CopyButton/CopyButton';
import { linkifyText } from 'utils/linkifyText';
import { openInNewTab } from 'utils/navigation';

import styles from './DashboardInfo.module.scss';

import TagsOverflowTooltip from './TagsOverflowTooltip';
import { getLockTooltip } from './utils';
import { DASHBOARD_NAME_MAX_LENGTH } from '../../constants';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useDashboardEditContext } from '../../hooks/useDashboardEditContext';
import { useDashboardControlGroup } from '../../controls/useDashboardControlGroup';

// The tag cluster keeps a fixed footprint so a long title ellipsizes around it
// instead of collapsing the tags: show up to two tags, then a `+N` overflow badge.
const MAX_VISIBLE_TAGS = 2;

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
	/** Why the toggle is unavailable, when onToggleLock is absent. */
	lockDisabledTooltip?: string;
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
	lockDisabledTooltip,
	isEditing,
	draft,
	onDraftChange,
	onStartEdit,
	onCommit,
	onCancel,
}: DashboardInfoProps): JSX.Element {
	const { isEditable: canEdit } = useDashboardEditContext();
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const show = useDashboardControlGroup('title');

	const hasTags = show.tags && tags.length > 0;
	const hasDescription = show.description && !isEmpty(description);

	const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
	const remainingTags = tags.slice(MAX_VISIBLE_TAGS);

	const lockTooltip = getLockTooltip({
		isLocked: isDashboardLocked,
		canToggle: !!onToggleLock,
		disabledReason: lockDisabledTooltip,
	});

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			onCommit();
		} else if (event.key === 'Escape') {
			onCancel();
		}
	};

	// Clicking outside the editor commits, matching the input's Enter behaviour.
	// Guard against blurs that move focus to the Save/Cancel buttons within it.
	const onEditorBlur = (event: FocusEvent<HTMLDivElement>): void => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			onCommit();
		}
	};

	const handleOpenPublicUrl = (): void => {
		void logEvent(DashboardDetailEvents.PublicUrlOpened, {
			dashboardId,
			dashboardName: title,
		});
		openInNewTab(publicUrl);
	};

	const handleCopyId = (): void => {
		toast.success('Dashboard ID copied to clipboard');
	};

	return (
		<div className={styles.dashboardInfo}>
			{show.name && (
				<img src={image} alt={title} className={styles.dashboardImage} />
			)}

			{show.name &&
				(isEditing ? (
					<div className={styles.dashboardTitleEditor} onBlur={onEditorBlur}>
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
							variant="solid"
							color="primary"
							size="sm"
							icon
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
							size="sm"
							icon
							aria-label="Cancel title edit"
							testId="dashboard-title-cancel"
							onClick={onCancel}
						>
							<X size={14} />
						</Button>
					</div>
				) : (
					<>
						<Tooltip title={title}>
							<Typography.Text
								className={cx(styles.dashboardTitle, {
									[styles.dashboardTitleHover]: canEdit,
								})}
								data-testid="dashboard-title"
								onClick={canEdit ? onStartEdit : undefined}
							>
								{title}
							</Typography.Text>
						</Tooltip>
						<CopyButton
							value={dashboardId}
							ariaLabel="Copy dashboard ID"
							testId="dashboard-copy-id"
							onCopy={handleCopyId}
						/>
					</>
				))}

			{hasDescription && (
				<Tooltip
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
				</Tooltip>
			)}

			{show.publicBadge && isPublicDashboard && (
				<Tooltip title="This dashboard is publicly accessible. Click to open the public page.">
					<Button
						type="button"
						variant="ghost"
						color="secondary"
						size="sm"
						icon
						aria-label="Open public dashboard"
						testId="dashboard-public-link"
						onClick={handleOpenPublicUrl}
					>
						<Globe size={14} />
					</Button>
				</Tooltip>
			)}

			{show.lock && showLockToggle && (
				<Tooltip title={onToggleLock ? lockTooltip : undefined}>
					<Button
						disabledTooltip={lockTooltip}
						type="button"
						variant="ghost"
						color="secondary"
						size="sm"
						icon
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
				</Tooltip>
			)}

			{hasTags && (
				<>
					<span className={styles.divider} />
					<div className={styles.dashboardTags} data-testid="dashboard-tags">
						{visibleTags.map((tag) => (
							<TagBadge key={tag}>{tag}</TagBadge>
						))}
						{remainingTags.length > 0 && (
							<Tooltip title={<TagsOverflowTooltip tags={remainingTags} />}>
								<span data-testid="dashboard-tags-overflow">
									<TagBadge>+{remainingTags.length}</TagBadge>
								</span>
							</Tooltip>
						)}
					</div>
				</>
			)}
		</div>
	);
}

export default DashboardInfo;
