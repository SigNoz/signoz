import { Drawer, Tabs } from 'antd';
import JSONView from 'container/LogDetailedView/JsonView';
import TableView from 'container/LogDetailedView/TableView';

import { LogDetailProps } from './LogDetail.interfaces';

function LogDetail({ log, onClose }: LogDetailProps): JSX.Element {
	const onDrawerClose = (): void => {
		onClose();
	};

	const items = [
		{
			label: 'Table',
			key: '1',
			children: log && <TableView logData={log} />,
		},
		{
			label: 'JSON',
			key: '2',
			children: log && <JSONView logData={log} />,
		},
	];

	return (
		<Drawer
			width="60%"
			title="Log Details"
			placement="right"
			closable
			onClose={onDrawerClose}
			open={log !== null}
			style={{ overscrollBehavior: 'contain' }}
			destroyOnClose
		>
			<Tabs defaultActiveKey="1" items={items} />
		</Drawer>
	);
}

export default LogDetail;
