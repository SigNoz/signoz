import { Button, Dropdown, MenuProps, Modal } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { Dashboard } from 'types/api/dashboard/getAll';

import { MENU_KEY, MENU_LABEL } from './config';
import ExportPanelContainer from './ExportPanel';

function ExportPanel({
	isLoading,
	onExport,
	onCreateAlerts,
}: ExportPanelProps): JSX.Element {
	const [isExport, setIsExport] = useState<boolean>(false);

	const onModalToggle = useCallback((value: boolean) => {
		setIsExport(value);
	}, []);

	const onMenuClickHandler: MenuProps['onClick'] = useCallback(
		(e: OnClickProps) => {
			if (e.key === MENU_KEY.EXPORT) {
				onModalToggle(true);
			}

			if (e.key === MENU_KEY.CREATE_ALERTS) {
				onCreateAlerts();
			}
		},
		[onModalToggle, onCreateAlerts],
	);

	const menu: MenuProps = useMemo(
		() => ({
			items: [
				{
					key: MENU_KEY.EXPORT,
					label: MENU_LABEL.EXPORT,
				},
				{
					key: MENU_KEY.CREATE_ALERTS,
					label: MENU_LABEL.CREATE_ALERTS,
				},
			],
			onClick: onMenuClickHandler,
		}),
		[onMenuClickHandler],
	);

	const onCancel = (value: boolean) => (): void => {
		onModalToggle(value);
	};

	return (
		<>
			<Dropdown trigger={['click']} menu={menu}>
				<Button>Actions</Button>
			</Dropdown>
			<Modal
				footer={null}
				onOk={onCancel(false)}
				onCancel={onCancel(false)}
				open={isExport}
				centered
			>
				<ExportPanelContainer
					onCreateAlerts={onCreateAlerts}
					isLoading={isLoading}
					onExport={onExport}
				/>
			</Modal>
		</>
	);
}

ExportPanel.defaultProps = {
	isLoading: false,
};

interface OnClickProps {
	key: string;
}

export interface ExportPanelProps {
	isLoading?: boolean;
	onExport: (dashboard: Dashboard | null) => void;
	onCreateAlerts: VoidFunction;
}

export default ExportPanel;
