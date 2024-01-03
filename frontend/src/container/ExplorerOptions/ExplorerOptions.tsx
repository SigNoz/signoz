import './ExplorerOptions.styles.scss';

import { Button, Modal, Select } from 'antd';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import ExportPanelContainer from 'container/ExportPanel/ExportPanelContainer';
import history from 'lib/history';
import { ConciergeBell, Disc3, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

function ExplorerOptions({
	isLoading,
	onExport,
	query,
}: ExplorerOptionsProps): JSX.Element {
	const [isExport, setIsExport] = useState<boolean>(false);

	const onModalToggle = useCallback((value: boolean) => {
		setIsExport(value);
	}, []);

	const onCreateAlertsHandler = useCallback(() => {
		history.push(
			`${ROUTES.ALERTS_NEW}?${QueryParams.compositeQuery}=${encodeURIComponent(
				JSON.stringify(query),
			)}`,
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
			<div className="explorer-options">
				<div className="view-options">
					<Select
						showSearch
						placeholder="Select a view"
						optionFilterProp="children"
						filterOption={(input, option) => (option?.label ?? '').includes(input)}
						filterSort={(optionA, optionB) =>
							(optionA?.label ?? '')
								.toLowerCase()
								.localeCompare((optionB?.label ?? '').toLowerCase())
						}
						options={[
							{
								value: '1',
								label: 'Not Identified',
							},
							{
								value: '2',
								label: 'Closed',
							},
							{
								value: '3',
								label: 'Communicated',
							},
							{
								value: '4',
								label: 'Identified',
							},
							{
								value: '5',
								label: 'Resolved',
							},
							{
								value: '6',
								label: 'Cancelled',
							},
						]}
					/>

					<Button shape="round">
						<Disc3 size={16} /> Save this view
					</Button>
				</div>

				<hr />

				<div className="actions">
					<Button shape="circle" onClick={onCreateAlertsHandler}>
						<ConciergeBell size={16} />
					</Button>

					<Button shape="circle" onClick={onAddToDashboard}>
						<Plus size={16} />
					</Button>
				</div>
			</div>

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

export interface ExplorerOptionsProps {
	isLoading?: boolean;
	onExport: (dashboard: Dashboard | null) => void;
	query: Query | null;
}

ExplorerOptions.defaultProps = { isLoading: false };

export default ExplorerOptions;
