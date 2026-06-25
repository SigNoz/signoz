import { KeyboardEvent } from 'react';
import { Check, Globe, LockKeyhole, SolidInfoCircle, X } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { isEmpty } from 'lodash-es';

import styles from './DashboardInfo.module.scss';
import { useVisibleTagCount } from './useVisibleTagCount';
import { useDashboardStore } from '../../store/useDashboardStore';

interface DashboardInfoProps {
	title: string;
	image: string;
	tags: string[];
	description: string;
	isPublicDashboard: boolean;
	isDashboardLocked: boolean;
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
	isDashboardLocked,
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
						maxLength={120}
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
				<TooltipSimple title={title}>
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
				<TooltipSimple title={description}>
					<SolidInfoCircle
						className={styles.descriptionIcon}
						size={14}
						data-testid="dashboard-description-info"
					/>
				</TooltipSimple>
			)}

			{isPublicDashboard && (
				<TooltipSimple title="This dashboard is publicly accessible">
					<Globe size={14} />
				</TooltipSimple>
			)}

			{isDashboardLocked && (
				<TooltipSimple title="This dashboard is locked">
					<LockKeyhole size={14} />
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
							<Badge key={tag} color="warning" variant="outline">
								{tag}
							</Badge>
						))}
						{remainingTags.length > 0 && (
							<TooltipSimple title={remainingTags.join(', ')}>
								<Badge
									color="warning"
									variant="outline"
									data-testid="dashboard-tags-overflow"
								>
									+{remainingTags.length}
								</Badge>
							</TooltipSimple>
						)}
					</div>
				</>
			)}
		</div>
	);
}

export default DashboardInfo;
