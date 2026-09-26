import { useCallback, useEffect, useState } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Button, Tooltip } from 'antd';
import { Divider } from '@signozhq/ui/divider';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { Switch } from '@signozhq/ui/switch';
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
import { NEW_ALERT_SCHEMA_VERSION } from 'types/api/alerts/alertTypesV2';
import { AlertDef } from 'types/api/alerts/def';

import { AlertHeaderProps } from '../AlertHeader';
import RenameModal from './RenameModal';

import './ActionButtons.styles.scss';

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

	const menuItems: DropdownItemType[] = [];
	if (!isV2Alert) {
		menuItems.push({
			type: 'item',
			value: 'rename-rule',
			label: 'Rename',
			prefix: <PenLine size={16} color={Color.BG_VANILLA_400} />,
			onClick: handleRename,
		});
	}
	menuItems.push(
		{
			type: 'item',
			value: 'duplicate-rule',
			label: 'Duplicate',
			prefix: <Copy size={16} color={Color.BG_VANILLA_400} />,
			onClick: handleAlertDuplicate,
		},
		{
			type: 'item',
			value: 'delete-rule',
			label: 'Delete',
			prefix: <Trash2 size={16} color={Color.BG_CHERRY_400} />,
			onClick: handleAlertDelete,
			danger: true,
		},
	);

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

	const toggleAlertRule = useCallback(() => {
		setIsAlertRuleDisabled((prev) => !prev);
		handleAlertStateToggle();
	}, [handleAlertStateToggle]);

	return (
		<>
			<div className="alert-action-buttons">
				<Tooltip title={isAlertRuleDisabled ? 'Enable alert' : 'Disable alert'}>
					{isAlertRuleDisabled !== undefined && (
						<Switch
							color="primary"
							textPlacement="right"
							onChange={toggleAlertRule}
							value={!isAlertRuleDisabled}
							testId="alert-actions-toggle"
						/>
					)}
				</Tooltip>
				<CopyToClipboard textToCopy={window.location.href} />

				<Divider type="vertical" className="alert-action-buttons__divider" />

				<Tooltip title="More options">
					<span className="dropdown-trigger-wrapper">
						<Dropdown items={menuItems} nativeButton align="end" side="bottom">
							<Button
								type="text"
								data-testid="alert-actions-menu"
								icon={
									<Ellipsis
										size={16}
										color={isDarkMode ? Color.BG_VANILLA_400 : Color.BG_INK_400}
									/>
								}
							/>
						</Dropdown>
					</span>
				</Tooltip>
			</div>

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
