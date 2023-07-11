import { AlertOutlined, AreaChartOutlined } from '@ant-design/icons';
import { Button, Modal, Space } from 'antd';
import { queryParamNamesMap } from 'constants/queryBuilderQueryNames';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { useCallback, useState } from 'react';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

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

	const onCancel = (value: boolean) => (): void => {
		onModalToggle(value);
	};

	const onAddToDashboard = (): void => {
		setIsExport(true);
	};

	return (
		<>
			<Space size={24}>
				<Button
					icon={<AreaChartOutlined />}
					onClick={onAddToDashboard}
					type="primary"
				>
					Add to Dashboard
				</Button>

				<Button onClick={onCreateAlertsHandler} icon={<AlertOutlined />}>
					Setup Alerts
				</Button>
			</Space>

			<Modal
				footer={null}
				onOk={onCancel(false)}
				onCancel={onCancel(false)}
				open={isExport}
				centered
				destroyOnClose
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

export interface ExportPanelProps {
	isLoading?: boolean;
	onExport: (dashboard: Dashboard | null) => void;
	query: Query | null;
}

ExportPanel.defaultProps = { isLoading: false };

export default ExportPanel;
