import { KeyboardEvent } from 'react';
import { Check, Globe, LockKeyhole, X } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { isEmpty } from 'lodash-es';

import styles from './DashboardInfo.module.scss';
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
			<div className={styles.dashboardTitleContainer}>
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
			</div>

			{hasTags && (
				<div className={styles.dashboardTags}>
					{tags.map((tag) => (
						<Badge key={tag} color="warning" variant="outline">
							{tag}
						</Badge>
					))}
				</div>
			)}

			{hasDescription && (
				<Typography.Text color="muted">{description}</Typography.Text>
			)}
		</div>
	);
}

export default DashboardInfo;
