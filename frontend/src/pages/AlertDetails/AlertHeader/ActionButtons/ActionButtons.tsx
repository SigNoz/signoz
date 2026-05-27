import { useCallback, useEffect, useMemo, useState } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Divider, Dropdown, MenuProps, Tooltip } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Copy, Ellipsis, PenLine, Trash2 } from '@signozhq/icons';
import {
	useAlertRuleDelete,
	useAlertRuleDuplicate,
	useAlertRuleStatusToggle,
	useAlertRuleUpdate,
} from 'pages/AlertDetails/hooks';
import CopyToClipboard from 'periscope/components/CopyToClipboard';
import { useAlertRule } from 'providers/Alert';
import { CSSProperties } from 'styled-components';
import { NEW_ALERT_SCHEMA_VERSION } from 'types/api/alerts/alertTypesV2';
import { AlertDef } from 'types/api/alerts/def';

import { AlertHeaderProps } from '../AlertHeader';
import AlertStateSegmented, {
	AlertSegmentedState,
} from '../MuteAlert/AlertStateSegmented';
import MutePopover from '../MuteAlert/MutePopover';
import MuteSchedulerDrawer from '../MuteAlert/MuteSchedulerDrawer';
import { useActiveMutes } from '../MuteAlert/useActiveMutes';
import { useMuteAlertRule } from '../MuteAlert/useMuteAlertRule';
import RenameModal from './RenameModal';

import './ActionButtons.styles.scss';

const menuItemStyle: CSSProperties = {
	fontSize: '14px',
	letterSpacing: '0.14px',
};

const menuItemStyleV2: CSSProperties = {
	fontSize: '13px',
	letterSpacing: '0.13px',
};

function AlertActionButtons({
	ruleId,
	alertDetails,
}: {
	ruleId: string;
	alertDetails: AlertHeaderProps['alertDetails'];
}): JSX.Element {
	const { alertRuleState, setAlertRuleState, alertRuleName, setAlertRuleName } =
		useAlertRule();
	const [intermediateName, setIntermediateName] = useState<string>(
		alertDetails.alert,
	);
	const [isRenameAlertOpen, setIsRenameAlertOpen] = useState<boolean>(false);
	const isDarkMode = useIsDarkMode();

	const { handleAlertStateToggle } = useAlertRuleStatusToggle({ ruleId });
	const { handleAlertDuplicate } = useAlertRuleDuplicate({
		alertDetails: alertDetails as unknown as AlertDef,
	});
	const { handleAlertDelete } = useAlertRuleDelete({ ruleId });
	const { handleAlertUpdate, isLoading } = useAlertRuleUpdate({
		alertDetails: alertDetails as unknown as AlertDef,
		setAlertRuleName,
		intermediateName,
	});

	const handleRename = useCallback(() => {
		setIsRenameAlertOpen(true);
	}, []);

	const onNameChangeHandler = useCallback(() => {
		handleAlertUpdate();
		setIsRenameAlertOpen(false);
	}, [handleAlertUpdate]);

	const isV2Alert = alertDetails.schemaVersion === NEW_ALERT_SCHEMA_VERSION;

	const finalMenuItemStyle = isV2Alert ? menuItemStyleV2 : menuItemStyle;

	const menuItems: MenuProps['items'] = [
		...(!isV2Alert
			? [
					{
						key: 'rename-rule',
						label: 'Rename',
						icon: <PenLine size={16} color={Color.BG_VANILLA_400} />,
						onClick: handleRename,
						style: finalMenuItemStyle,
					},
				]
			: []),
		{
			key: 'duplicate-rule',
			label: 'Duplicate',
			icon: <Copy size={16} color={Color.BG_VANILLA_400} />,
			onClick: handleAlertDuplicate,
			style: finalMenuItemStyle,
		},
		{
			key: 'delete-rule',
			label: 'Delete',
			icon: <Trash2 size={16} color={Color.BG_CHERRY_400} />,
			onClick: handleAlertDelete,
			style: {
				...finalMenuItemStyle,
				color: Color.BG_CHERRY_400,
			},
		},
	];

	// state for immediate UI feedback rather than waiting for onSuccess of handleAlertStateTiggle to updating the alertRuleState
	const [isAlertRuleDisabled, setIsAlertRuleDisabled] = useState<
		undefined | boolean
	>(undefined);

	useEffect(() => {
		if (alertRuleState === undefined) {
			setAlertRuleState(alertDetails.state);
			setIsAlertRuleDisabled(alertDetails.state === 'disabled');
		}
	}, [setAlertRuleState, alertRuleState, alertDetails.state]);

	useEffect(() => {
		if (alertRuleName !== undefined) {
			setIntermediateName(alertRuleName);
		}
	}, [alertRuleName]);

	// on unmount remove the alert state
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => (): void => setAlertRuleState(undefined), []);

	const { activeMutes, refetch: refetchActiveMute } = useActiveMutes(ruleId);

	const segmentedState: AlertSegmentedState = useMemo(() => {
		if (isAlertRuleDisabled) {
			return 'disabled';
		}
		if (activeMutes.length) {
			return 'muted';
		}
		return 'active';
	}, [isAlertRuleDisabled, activeMutes]);

	const [isMutePopoverOpen, setIsMutePopoverOpen] = useState<boolean>(false);
	const [isMuteDrawerOpen, setIsMuteDrawerOpen] = useState<boolean>(false);

	const { mute, isLoading: isMuting } = useMuteAlertRule({
		ruleId,
		onSuccess: () => {
			setIsMutePopoverOpen(false);
			setIsMuteDrawerOpen(false);
			refetchActiveMute();
		},
	});

	const handleActiveClick = useCallback(() => {
		// If currently disabled, re-enable. Otherwise (already active) no-op.
		// When muted, the segmented control disables this button.
		if (isAlertRuleDisabled) {
			setIsAlertRuleDisabled(false);
			handleAlertStateToggle();
		}
	}, [isAlertRuleDisabled, handleAlertStateToggle]);

	const handleMuteClick = useCallback(() => {
		if (segmentedState === 'active') {
			setIsMutePopoverOpen(true);
		}
	}, [segmentedState]);

	const handleDisableClick = useCallback(() => {
		if (!isAlertRuleDisabled) {
			setIsAlertRuleDisabled(true);
			handleAlertStateToggle();
		}
	}, [isAlertRuleDisabled, handleAlertStateToggle]);

	const ruleDisplayName = alertRuleName ?? alertDetails.alert;

	return (
		<>
			<div className="alert-action-buttons">
				{isAlertRuleDisabled !== undefined && (
					<div className="alert-state-segmented-wrapper">
						<AlertStateSegmented
							state={segmentedState}
							onActive={handleActiveClick}
							onMute={handleMuteClick}
							onDisable={handleDisableClick}
						/>
						<MutePopover
							open={isMutePopoverOpen}
							onOpenChange={setIsMutePopoverOpen}
							ruleName={ruleDisplayName}
							isLoading={isMuting}
							onSubmit={mute}
							onOpenCustomWindow={(): void => setIsMuteDrawerOpen(true)}
							anchor={<span className="alert-state-segmented-anchor" />}
						/>
					</div>
				)}

				<CopyToClipboard textToCopy={window.location.href} />

				<Divider type="vertical" />

				<Dropdown trigger={['click']} menu={{ items: menuItems }}>
					<Tooltip title="More options">
						<Ellipsis
							size={16}
							color={isDarkMode ? Color.BG_VANILLA_400 : Color.BG_INK_400}
							cursor="pointer"
							className="dropdown-icon"
						/>
					</Tooltip>
				</Dropdown>
			</div>

			<MuteSchedulerDrawer
				open={isMuteDrawerOpen}
				onClose={(): void => setIsMuteDrawerOpen(false)}
				ruleName={ruleDisplayName}
				isLoading={isMuting}
				onSubmit={mute}
			/>

			<RenameModal
				isOpen={isRenameAlertOpen}
				setIsOpen={setIsRenameAlertOpen}
				isLoading={isLoading}
				onNameChangeHandler={onNameChangeHandler}
				intermediateName={intermediateName}
				setIntermediateName={setIntermediateName}
			/>
		</>
	);
}

export default AlertActionButtons;
