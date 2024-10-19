import './ActionButtons.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Divider, Dropdown, MenuProps, Switch, Tooltip } from 'antd';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { Copy, Ellipsis, PenLine, Trash2 } from 'lucide-react';
import {
	useAlertRuleDelete,
	useAlertRuleDuplicate,
	useAlertRuleStatusToggle,
} from 'pages/AlertDetails/hooks';
import CopyToClipboard from 'periscope/components/CopyToClipboard';
import { useAlertRule } from 'providers/Alert';
import React, { useEffect, useState } from 'react';
import { CSSProperties } from 'styled-components';
import { AlertDef } from 'types/api/alerts/def';

import { AlertHeaderProps } from '../AlertHeader';

const menuItemStyle: CSSProperties = {
	fontSize: '14px',
	letterSpacing: '0.14px',
};
function AlertActionButtons({
	ruleId,
	alertDetails,
}: {
	ruleId: string;
	alertDetails: AlertHeaderProps['alertDetails'];
}): JSX.Element {
	const { alertRuleState, setAlertRuleState } = useAlertRule();
	const { handleAlertStateToggle } = useAlertRuleStatusToggle({ ruleId });

	const { handleAlertDuplicate } = useAlertRuleDuplicate({
		alertDetails: (alertDetails as unknown) as AlertDef,
	});
	const { handleAlertDelete } = useAlertRuleDelete({ ruleId: Number(ruleId) });

	const params = useUrlQuery();

	const handleRename = React.useCallback(() => {
		params.set(QueryParams.ruleId, String(ruleId));
		history.push(`${ROUTES.ALERT_OVERVIEW}?${params.toString()}`);
	}, [params, ruleId]);

	const menu: MenuProps['items'] = React.useMemo(
		() => [
			{
				key: 'rename-rule',
				label: 'Rename',
				icon: <PenLine size={16} color={Color.BG_VANILLA_400} />,
				onClick: (): void => handleRename(),
				style: menuItemStyle,
			},
			{
				key: 'duplicate-rule',
				label: 'Duplicate',
				icon: <Copy size={16} color={Color.BG_VANILLA_400} />,
				onClick: (): void => handleAlertDuplicate(),
				style: menuItemStyle,
			},
			{ type: 'divider' },
			{
				key: 'delete-rule',
				label: 'Delete',
				icon: <Trash2 size={16} color={Color.BG_CHERRY_400} />,
				onClick: (): void => handleAlertDelete(),
				style: {
					...menuItemStyle,
					color: Color.BG_CHERRY_400,
				},
			},
		],
		[handleAlertDelete, handleAlertDuplicate, handleRename],
	);
	const isDarkMode = useIsDarkMode();

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

	return (
		<div className="alert-action-buttons">
			<Tooltip title={alertRuleState ? 'Enable alert' : 'Disable alert'}>
				{isAlertRuleDisabled !== undefined && (
					<Switch
						size="small"
						onChange={(): void => {
							setIsAlertRuleDisabled((prev) => !prev);
							handleAlertStateToggle();
						}}
						checked={!isAlertRuleDisabled}
					/>
				)}
			</Tooltip>
			<CopyToClipboard textToCopy={window.location.href} />

			<Divider type="vertical" />

			<Dropdown trigger={['click']} menu={{ items: menu }}>
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
	);
}

export default AlertActionButtons;
