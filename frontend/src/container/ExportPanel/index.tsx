import { Modal } from 'antd';
import { useCallback, useState } from 'react';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import ExportPanelContainer from './ExportPanelContainer';

function ExportPanel({
	isLoading,
	onExport,
	query,
}: ExportPanelProps): JSX.Element {
	const [isExport, setIsExport] = useState<boolean>(false);

	const onModalToggle = useCallback((value: boolean) => {
		setIsExport(value);
	}, []);

	const onCancel = (value: boolean) => (): void => {
		onModalToggle(value);
	};

	return (
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
	);
}

export interface ExportPanelProps {
	isLoading?: boolean;
	onExport: (dashboard: Dashboard | null, isNewDashboard?: boolean) => void;
	query: Query | null;
}

ExportPanel.defaultProps = { isLoading: false };

export default ExportPanel;
