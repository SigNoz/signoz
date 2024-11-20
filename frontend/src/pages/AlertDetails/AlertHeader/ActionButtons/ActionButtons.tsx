import './ActionButtons.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Divider, Dropdown, MenuProps, Switch, Tooltip } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Copy, Ellipsis, PenLine, Trash2 } from 'lucide-react';
import {
	useAlertRuleDelete,
	useAlertRuleDuplicate,
	useAlertRuleStatusToggle,
	useAlertRuleUpdate,
} from 'pages/AlertDetails/hooks';
import CopyToClipboard from 'periscope/components/CopyToClipboard';
import { useAlertRule } from 'providers/Alert';
import { useCallback, useEffect, useState } from 'react';
import { CSSProperties } from 'styled-components';
import { AlertDef } from 'types/api/alerts/def';

import { AlertHeaderProps } from '../AlertHeader';
import RenameModal from './RenameModal';

const menuItemStyle: CSSProperties = {
	fontSize: '14px',
	letterSpacing: '0.14px',
};

function AlertActionButtons({
	ruleId,
	alertDetails,
	setUpdatedName,
}: {
	ruleId: string;
	alertDetails: AlertHeaderProps['alertDetails'];
	setUpdatedName: (name: string) => void;
}): JSX.Element {
	const { alertRuleState, setAlertRuleState } = useAlertRule();
	const [intermediateName, setIntermediateName] = useState<string>(
		alertDetails.alert,
	);
	const [isRenameAlertOpen, setIsRenameAlertOpen] = useState<boolean>(false);
	const isDarkMode = useIsDarkMode();

	const { handleAlertStateToggle } = useAlertRuleStatusToggle({ ruleId });
	const { handleAlertDuplicate } = useAlertRuleDuplicate({
		alertDetails: (alertDetails as unknown) as AlertDef,
	});
	const { handleAlertDelete } = useAlertRuleDelete({ ruleId: Number(ruleId) });
	const { handleAlertUpdate, isLoading } = useAlertRuleUpdate({
		alertDetails: (alertDetails as unknown) as AlertDef,
		setUpdatedName,
		intermediateName,
	});

	const handleRename = useCallback(() => {
		setIsRenameAlertOpen(true);
	}, []);

	const onNameChangeHandler = useCallback(() => {
		handleAlertUpdate();
		setIsRenameAlertOpen(false);
	}, [handleAlertUpdate]);

	const menuItems: MenuProps['items'] = [
		{
			key: 'rename-rule',
			label: 'Rename',
			icon: <PenLine size={16} color={Color.BG_VANILLA_400} />,
			onClick: handleRename,
			style: menuItemStyle,
		},
		{
			key: 'duplicate-rule',
			label: 'Duplicate',
			icon: <Copy size={16} color={Color.BG_VANILLA_400} />,
			onClick: handleAlertDuplicate,
			style: menuItemStyle,
		},
		{
			key: 'delete-rule',
			label: 'Delete',
			icon: <Trash2 size={16} color={Color.BG_CHERRY_400} />,
			onClick: handleAlertDelete,
			style: {
				...menuItemStyle,
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
				<Tooltip title={alertRuleState ? 'Enable alert' : 'Disable alert'}>
					{isAlertRuleDisabled !== undefined && (
						<Switch
							size="small"
							onChange={toggleAlertRule}
							checked={!isAlertRuleDisabled}
						/>
					)}
				</Tooltip>
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
