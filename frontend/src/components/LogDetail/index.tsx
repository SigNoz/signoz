import './LogDetails.styles.scss';

import { CloseOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Divider, Drawer, Radio, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import JSONView from 'container/LogDetailedView/JsonView';
import TableView from 'container/LogDetailedView/TableView';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useState } from 'react';

import { VIEW_TYPES, VIEWS } from './constants';
import { LogDetailProps } from './LogDetail.interfaces';

function LogDetail({
	log,
	onClose,
	onAddToQuery,
	onClickActionItem,
}: LogDetailProps): JSX.Element {
	console.log({ log });
	const [selectedView, setSelectedView] = useState<VIEWS>(VIEW_TYPES.OVERVIEW);
	// const items = useMemo(
	// 	() => [
	// 		{
	// 			label: 'Table',
	// 			key: '1',
	// 			children: log && (
	// 				<TableView
	// 					logData={log}
	// 					onAddToQuery={onAddToQuery}
	// 					onClickActionItem={onClickActionItem}
	// 				/>
	// 			),
	// 		},
	// 		{
	// 			label: 'JSON',
	// 			key: '2',
	// 			children: log && <JSONView logData={log} />,
	// 		},
	// 	],
	// 	[log, onAddToQuery, onClickActionItem],
	// );

	const isDarkMode = useIsDarkMode();
	const handleModeChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
	};

	if (!log) {
		return <>No log data</>;
	}

	return (
		<Drawer
			width="60%"
			title={
				<>
					<Divider type="vertical" /> Log Detail
				</>
			}
			placement="right"
			closable
			onClose={onClose}
			open={log !== null}
			style={{ overscrollBehavior: 'contain', background: Color.BG_SLATE_500 }}
			className="log-detail-drawer"
			destroyOnClose
			closeIcon={
				<CloseOutlined
					style={{
						color: isDarkMode ? Color.BG_VANILLA_400 : Color.BG_SLATE_500,
						fontSize: 16,
					}}
				/>
			}
			extra={
				<>
					<Radio.Button className="log-detail-drawer__radio-button">
						<UpOutlined />
					</Radio.Button>
					<Radio.Button className="log-detail-drawer__radio-button">
						<DownOutlined />
					</Radio.Button>
				</>
			}
		>
			<div className="log-detail-drawer__log">
				<Divider type="vertical" style={{ fontSize: '20px' }} />
				<Typography.Text>{log?.body}</Typography.Text>
			</div>

			<Radio.Group
				className="views-tabs"
				onChange={handleModeChange}
				value={selectedView}
			>
				<Radio.Button
					className={selectedView === 'OVERVIEW' ? 'selected_view' : undefined}
					value={VIEW_TYPES.OVERVIEW}
				>
					Overview
				</Radio.Button>
				<Radio.Button
					className={selectedView === 'JSON' ? 'selected_view' : undefined}
					value={VIEW_TYPES.JSON}
				>
					JSON
				</Radio.Button>
				<Radio.Button
					className={selectedView === 'CONTENT' ? 'selected_view' : undefined}
					value={VIEW_TYPES.CONTENT}
				>
					Content
				</Radio.Button>
			</Radio.Group>
			{selectedView === VIEW_TYPES.OVERVIEW && (
				<TableView
					logData={log}
					onAddToQuery={onAddToQuery}
					onClickActionItem={onClickActionItem}
				/>
			)}
			{selectedView === VIEW_TYPES.JSON && <JSONView logData={log} />}
		</Drawer>
	);
}

export default LogDetail;
