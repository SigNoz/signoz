import { useCallback } from 'react';
import { SolidAlertTriangle, X } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Divider } from '@signozhq/ui/divider';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import { useConfirmableAction } from 'hooks/useConfirmableAction';

import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';

import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import styles from './Header.module.scss';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

interface HeaderProps {
	/** Unsaved edits exist — shows the "Unsaved Changes" badge and gates the discard confirmation on close (not the Save button). */
	isDirty: boolean;
	isSaving: boolean;
	showSwitchToView?: boolean;
	/** Locked/no-permission dashboard — Save is disabled with a reason. */
	readOnly?: boolean;
	/** Present when saving is unavailable — the Save button explains itself with it. */
	readOnlyChecks?: BrandedPermission[];
	readOnlyTooltip?: string;
	onSave: () => void;
	onSwitchToView?: () => void;
	onClose: () => void;
}

function Header({
	isDirty,
	isSaving,
	showSwitchToView = false,
	readOnly = false,
	readOnlyChecks = [],
	readOnlyTooltip,
	onSave,
	onSwitchToView,
	onClose,
}: HeaderProps): JSX.Element {
	const discard = useConfirmableAction(
		useCallback(async (): Promise<void> => {
			// Only reachable after confirming a discard, which is gated on unsaved edits.
			void logEvent(DashboardDetailEvents.PanelEditorDiscarded, {
				wasDirty: true,
			});
			onClose();
		}, [onClose]),
	);

	// Confirm before closing with unsaved edits; a pristine panel closes straight away.
	const handleCloseClick = useCallback((): void => {
		if (isDirty) {
			discard.request();
		} else {
			onClose();
		}
	}, [isDirty, onClose, discard]);

	return (
		<div className={styles.header}>
			<div className={styles.title}>
				<Button
					aria-label="Close"
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					testId="panel-editor-v2-close"
					onClick={handleCloseClick}
				>
					<X size={14} />
				</Button>
				<Divider type="vertical" />
				<Typography.Text>Configure panel</Typography.Text>
				{isDirty && (
					<Badge
						variant="solid"
						color="warning"
						testId="panel-editor-v2-unsaved-badge"
					>
						Unsaved Changes
					</Badge>
				)}
			</div>
			<div className={styles.actions}>
				<HeaderRightSection
					enableAnnouncements={false}
					enableShare={false}
					enableFeedback={false}
				/>
				{showSwitchToView && (
					<Button
						size="md"
						variant="outlined"
						color="secondary"
						testId="panel-editor-v2-switch-to-view"
						onClick={onSwitchToView}
					>
						Switch to View Mode
					</Button>
				)}
				<AuthZTooltip
					checks={readOnlyChecks}
					disabledTooltip={readOnly ? readOnlyTooltip : undefined}
				>
					<Button
						disabledTooltip={undefined}
						size="md"
						variant="solid"
						color="primary"
						testId="panel-editor-v2-save"
						disabled={readOnly}
						loading={!readOnly && isSaving}
						onClick={readOnly ? undefined : onSave}
					>
						Save changes
					</Button>
				</AuthZTooltip>
			</div>

			<DialogWrapper
				open={discard.open}
				onOpenChange={(next: boolean): void => {
					if (!next) {
						discard.cancel();
					}
				}}
				title="Discard changes?"
				titleIcon={<SolidAlertTriangle size={14} color="#fdd600" />}
				testId="panel-editor-v2-discard-modal"
				footer={
					<>
						<Button
							size="md"
							type="button"
							variant="solid"
							color="danger"
							testId="panel-editor-v2-discard-confirm"
							loading={discard.isPending}
							onClick={discard.confirm}
						>
							Discard
						</Button>
						<Button
							size="md"
							type="button"
							variant="outlined"
							color="secondary"
							testId="panel-editor-v2-discard-cancel"
							onClick={discard.cancel}
						>
							Keep editing
						</Button>
					</>
				}
			>
				<Typography>Your unsaved edits to this panel will be lost.</Typography>
			</DialogWrapper>
		</div>
	);
}

export default Header;
