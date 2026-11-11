import { useCallback, useEffect, useState } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Button, Tooltip } from 'antd';
import { Divider } from '@signozhq/ui/divider';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { Switch } from '@signozhq/ui/switch';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Copy, Ellipsis, Trash2 } from '@signozhq/icons';
import {
	useAlertRuleClone,
	useAlertRuleDelete,
	useAlertRuleStatusToggle,
} from 'pages/AlertDetails/hooks';
import CopyToClipboard from 'periscope/components/CopyToClipboard';
import { useAlertRule } from 'providers/Alert';

import { AlertHeaderProps } from '../AlertHeader';

import './ActionButtons.styles.scss';

function AlertActionButtons({
	ruleId,
	alertDetails,
}: {
	ruleId: string;
	alertDetails: AlertHeaderProps['alertDetails'];
}): JSX.Element {
	const { alertRuleState, setAlertRuleState } = useAlertRule();
	const isDarkMode = useIsDarkMode();

	const { handleAlertStateToggle } = useAlertRuleStatusToggle({ ruleId });
	const { handleAlertClone } = useAlertRuleClone({ ruleId });
	const { handleAlertDelete } = useAlertRuleDelete({ ruleId });

	const menuItems: DropdownItemType[] = [
		{
			type: 'item',
			value: 'clone-rule',
			label: 'Clone',
			prefix: <Copy size={16} color={Color.BG_VANILLA_400} />,
			onClick: handleAlertClone,
		},
		{
			type: 'item',
			value: 'delete-rule',
			label: 'Delete',
			prefix: <Trash2 size={16} color={Color.BG_CHERRY_400} />,
			onClick: handleAlertDelete,
			danger: true,
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

	// on unmount remove the alert state
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => (): void => setAlertRuleState(undefined), []);

	const toggleAlertRule = useCallback(() => {
		setIsAlertRuleDisabled((prev) => !prev);
		handleAlertStateToggle();
	}, [handleAlertStateToggle]);

	return (
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
	);
}

export default AlertActionButtons;
