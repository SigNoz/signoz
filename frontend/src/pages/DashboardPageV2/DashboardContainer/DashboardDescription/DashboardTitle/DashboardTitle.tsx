import { KeyboardEvent } from 'react';
import { Check, Globe, LockKeyhole, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import styles from '../DashboardDescription.module.scss';

interface DashboardTitleProps {
	title: string;
	image: string;
	isPublicDashboard: boolean;
	isDashboardLocked: boolean;
	isEditable: boolean;
	isEditing: boolean;
	draft: string;
	onDraftChange: (value: string) => void;
	onStartEdit: () => void;
	onCommit: () => void;
	onCancel: () => void;
}

function DashboardTitle({
	title,
	image,
	isPublicDashboard,
	isDashboardLocked,
	isEditable,
	isEditing,
	draft,
	onDraftChange,
	onStartEdit,
	onCommit,
	onCancel,
}: DashboardTitleProps): JSX.Element {
	const canEdit = isEditable && !isDashboardLocked;

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			onCommit();
		} else if (event.key === 'Escape') {
			onCancel();
		}
	};

	return (
		<div className={styles.leftSection}>
			<img src={image} alt="dashboard-img" className={styles.dashboardImg} />
			{isEditing ? (
				<div className={styles.titleEdit}>
					<Input
						autoFocus
						value={draft}
						testId="dashboard-title-input"
						maxLength={120}
						className={styles.titleInput}
						onChange={(e): void => onDraftChange(e.target.value)}
						onKeyDown={onKeyDown}
					/>
					<Button
						type="button"
						variant="outlined"
						size="icon"
						className={cx(styles.titleEditActionButton, styles.titleSaveActionButton)}
						aria-label="Save title"
						testId="dashboard-title-save"
						onClick={onCommit}
					>
						<Check size={14} />
					</Button>
					<Button
						type="button"
						variant="outlined"
						color="destructive"
						size="icon"
						className={styles.titleEditActionButton}
						aria-label="Cancel title edit"
						testId="dashboard-title-cancel"
						onClick={onCancel}
					>
						<X size={14} />
					</Button>
				</div>
			) : (
				<TooltipSimple title={title.length > 30 ? title : ''}>
					<Typography.Text
						className={cx(styles.dashboardTitle, {
							[styles.clickableTitle]: canEdit,
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
