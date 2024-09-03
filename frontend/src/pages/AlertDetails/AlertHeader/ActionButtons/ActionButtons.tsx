import './ActionButtons.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Divider, Dropdown, MenuProps, Switch, Tooltip } from 'antd';
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
import React, { useCallback, useState } from 'react';
import { AlertDef } from 'types/api/alerts/def';

import { AlertHeaderProps } from '../AlertHeader';

const menuStyle: React.CSSProperties = {
	padding: 0,
	boxShadow: 'none',
	fontSize: 14,
};

function DropdownMenuRenderer(
	menu: React.ReactNode,
	handleDelete: () => void,
): React.ReactNode {
	return (
		<div className="dropdown-menu">
			{React.cloneElement(menu as React.ReactElement, {
				style: menuStyle,
			})}
			<Divider className="dropdown-divider" />
			<Button
				type="default"
				icon={<Trash2 size={16} color={Color.BG_CHERRY_400} />}
				className="delete-button"
				onClick={handleDelete}
			>
				Delete
			</Button>
		</div>
	);
}

function AlertActionButtons({
	ruleId,
	alertDetails,
}: {
	ruleId: string;
	alertDetails: AlertHeaderProps['alertDetails'];
}): JSX.Element {
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const { isAlertRuleDisabled } = useAlertRule();
	const { handleAlertStateToggle } = useAlertRuleStatusToggle({ ruleId });

	const { handleAlertDuplicate } = useAlertRuleDuplicate({
		alertDetails: (alertDetails as unknown) as AlertDef,
	});
	const { handleAlertDelete } = useAlertRuleDelete({ ruleId: Number(ruleId) });

	const handleDeleteWithClose = useCallback(() => {
		handleAlertDelete();
		setDropdownOpen(false);
	}, [handleAlertDelete]);

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
			},
			{
				key: 'duplicate-rule',
				label: 'Duplicate',
				icon: <Copy size={16} color={Color.BG_VANILLA_400} />,
				onClick: (): void => handleAlertDuplicate(),
			},
		],
		[handleAlertDuplicate, handleRename],
	);
	const isDarkMode = useIsDarkMode();

	return (
		<div className="alert-action-buttons">
			<Tooltip title={isAlertRuleDisabled ? 'Enable alert' : 'Disable alert'}>
				{isAlertRuleDisabled !== undefined && (
					<Switch
						size="small"
						onChange={handleAlertStateToggle}
						checked={!isAlertRuleDisabled}
					/>
				)}
			</Tooltip>
			<CopyToClipboard textToCopy={window.location.href} />

			<Divider type="vertical" />

			<Dropdown
				trigger={['click']}
				open={dropdownOpen}
				menu={{ items: menu }}
				onOpenChange={setDropdownOpen}
				dropdownRender={(menu: React.ReactNode): React.ReactNode =>
					DropdownMenuRenderer(menu, handleDeleteWithClose)
				}
			>
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
