import './ActionButtons.styles.scss';

import { Button, Divider, Dropdown, MenuProps, Switch, Tooltip } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Copy, Ellipsis, PenLine, Trash2 } from 'lucide-react';
import { useAlertRuleStatusToggle } from 'pages/AlertDetails/hooks';
import CopyToClipboard from 'periscope/components/CopyToClipboard';
import React from 'react';

const menu: MenuProps['items'] = [
	{
		key: 'rename-rule',
		label: 'Rename',
		icon: <PenLine size={16} color="var(--bg-vanilla-400" />,
		onClick: (): void => {},
	},
	{
		key: 'duplicate-rule',
		label: 'Duplicate',
		icon: <Copy size={16} color="var(--bg-vanilla-400" />,
		onClick: (): void => {},
	},
];

const menuStyle: React.CSSProperties = {
	padding: 0,
	boxShadow: 'none',
	fontSize: 14,
};

function AlertActionButtons({
	ruleId,
	state,
}: {
	ruleId: string;
	state: string;
}): JSX.Element {
	const {
		handleAlertStateToggle,
		isAlertRuleEnabled,
	} = useAlertRuleStatusToggle({ ruleId, state });
	const isDarkMode = useIsDarkMode();
	return (
		<div className="alert-action-buttons">
			<Switch
				size="small"
				onChange={handleAlertStateToggle}
				checked={isAlertRuleEnabled}
			/>
			<CopyToClipboard textToCopy={window.location.href} />

			<Divider type="vertical" />

			<Dropdown
				trigger={['click']}
				menu={{ items: menu }}
				// eslint-disable-next-line react/no-unstable-nested-components
				dropdownRender={(menu): JSX.Element => (
					<div className="dropdown-menu">
						{React.cloneElement(menu as React.ReactElement, {
							style: menuStyle,
						})}
						<Divider style={{ margin: 0 }} />
						<Button
							type="default"
							icon={<Trash2 size={16} color="var(--bg-cherry-400" />}
							className="delete-button"
						>
							Delete
						</Button>
					</div>
				)}
			>
				<Tooltip title="More options">
					<Ellipsis
						size={16}
						color={isDarkMode ? 'var(--bg-vanilla-400)' : 'var(--text-ink-400'}
						cursor="pointer"
						className="dropdown-icon"
					/>
				</Tooltip>
			</Dropdown>
		</div>
	);
}

export default AlertActionButtons;
