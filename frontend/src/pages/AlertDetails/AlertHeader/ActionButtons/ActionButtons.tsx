import { useCallback, useEffect, useMemo, useState } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Button, Tooltip } from 'antd';
import { Divider } from '@signozhq/ui/divider';
import { Switch } from '@signozhq/ui/switch';
import { getRuleActionChecks } from 'container/ListAlertRules/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import AuthZDropdown from 'lib/authz/components/AuthZDropdown/AuthZDropdown';
import type { AuthZDropdownItemType } from 'lib/authz/components/AuthZDropdown/types';
import { useAuthZDisabled } from 'lib/authz/hooks/useAuthZDisabled/useAuthZDisabled';
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

	const checks = useMemo(() => getRuleActionChecks(ruleId), [ruleId]);
	const toggleLock = useAuthZDisabled(checks.toggle);

	const menuItems = useMemo<AuthZDropdownItemType[]>(
		() => [
			{
				type: 'item',
				value: 'clone-rule',
				label: 'Clone',
				testId: 'alert-details-action-clone',
				checks: checks.clone,
				prefix: <Copy size={16} color={Color.BG_VANILLA_400} />,
				onClick: handleAlertClone,
			},
			{
				type: 'item',
				value: 'delete-rule',
				label: 'Delete',
				testId: 'alert-details-action-delete',
				checks: checks.delete,
				prefix: <Trash2 size={16} color={Color.BG_CHERRY_400} />,
				onClick: handleAlertDelete,
				danger: true,
			},
		],
		[checks, handleAlertClone, handleAlertDelete],
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

	// on unmount remove the alert state
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => (): void => setAlertRuleState(undefined), []);

	const toggleAlertRule = useCallback(() => {
		setIsAlertRuleDisabled((prev) => !prev);
		handleAlertStateToggle();
	}, [handleAlertStateToggle]);

	return (
		<div className="alert-action-buttons">
			<Tooltip
				title={
					toggleLock.disabled
						? undefined
						: isAlertRuleDisabled
							? 'Enable alert'
							: 'Disable alert'
				}
			>
				{isAlertRuleDisabled !== undefined && (
					<Switch
						color="primary"
						textPlacement="right"
						onChange={toggleAlertRule}
						value={!isAlertRuleDisabled}
						disabled={toggleLock.disabled}
						disabledTooltip={toggleLock.disabledTooltip}
						testId="alert-actions-toggle"
					/>
				)}
			</Tooltip>
			<CopyToClipboard textToCopy={window.location.href} />

			<span className="alert-action-buttons__divider">
				<Divider orientation="vertical" />
			</span>

			<Tooltip title="More options">
				<span className="dropdown-trigger-wrapper">
					<AuthZDropdown items={menuItems} nativeButton align="end" side="bottom">
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
					</AuthZDropdown>
				</span>
			</Tooltip>
		</div>
	);
}

export default AlertActionButtons;
