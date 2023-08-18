import { Drawer, Tabs } from 'antd';
import JSONView from 'container/LogDetailedView/JsonView';
import TableView from 'container/LogDetailedView/TableView';
import { useMemo } from 'react';

import { LogDetailProps } from './LogDetail.interfaces';

function LogDetail({
	log,
	onClose,
	onAddToQuery,
	onClickActionItem,
}: LogDetailProps): JSX.Element {
	const items = useMemo(
		() => [
			{
				label: 'Table',
				key: '1',
				children: log && (
					<TableView
						logData={log}
						onAddToQuery={onAddToQuery}
						onClickActionItem={onClickActionItem}
					/>
				),
			},
			{
				label: 'JSON',
				key: '2',
				children: log && <JSONView logData={log} />,
			},
		],
		[log, onAddToQuery, onClickActionItem],
	);

	return (
		<Drawer
			width="60%"
			title="Log Details"
			placement="right"
			closable
			onClose={onClose}
			open={log !== null}
			style={{ overscrollBehavior: 'contain' }}
			destroyOnClose
		>
			<Tabs defaultActiveKey="1" items={items} />
		</Drawer>
	);
}

export default LogDetail;
