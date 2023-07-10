import { Button, Dropdown, MenuProps, Modal } from 'antd';
import { queryParamNamesMap } from 'constants/queryBuilderQueryNames';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { useCallback, useMemo, useState } from 'react';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { MENU_KEY, MENU_LABEL } from './config';
import ExportPanelContainer from './ExportPanel';

function ExportPanel({
	isLoading,
	onExport,
	query,
}: ExportPanelProps): JSX.Element {
	const [isExport, setIsExport] = useState<boolean>(false);

	const onModalToggle = useCallback((value: boolean) => {
		setIsExport(value);
	}, []);

	const onCreateAlertsHandler = useCallback(() => {
		history.push(
			`${ROUTES.ALERTS_NEW}?${
				queryParamNamesMap.compositeQuery
			}=${encodeURIComponent(JSON.stringify(query))}`,
		);
	}, [query]);

	const onMenuClickHandler: MenuProps['onClick'] = useCallback(
		(e: OnClickProps) => {
			if (e.key === MENU_KEY.EXPORT) {
				onModalToggle(true);
			}

			if (e.key === MENU_KEY.CREATE_ALERTS) {
				onCreateAlertsHandler();
			}
		},
		[onModalToggle, onCreateAlertsHandler],
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
					query={query}
					isLoading={isLoading}
					onExport={onExport}
				/>
			</Modal>
		</>
	);
}

interface OnClickProps {
	key: string;
}

export interface ExportPanelProps {
	isLoading?: boolean;
	onExport: (dashboard: Dashboard | null) => void;
	query: Query | null;
}

ExportPanel.defaultProps = { isLoading: false };

export default ExportPanel;
