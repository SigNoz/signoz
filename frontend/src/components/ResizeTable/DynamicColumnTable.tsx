/* eslint-disable react/jsx-props-no-spreading */
import './DynamicColumnTable.syles.scss';

import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps, Popconfirm, Switch } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { SlidersHorizontal } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { popupContainer } from 'utils/selectPopupContainer';

import ResizeTable from './ResizeTable';
import { DynamicColumnTableProps } from './types';
import {
	getNewColumnData,
	getVisibleColumns,
	setVisibleColumns,
} from './utils';

function DynamicColumnTable({
	tablesource,
	columns,
	dynamicColumns,
	onDragColumn,
	multiRowActionsEnabled,
	multiRowActions,
	...restProps
}: DynamicColumnTableProps): JSX.Element {
	const [columnsData, setColumnsData] = useState<ColumnsType | undefined>(
		columns,
	);
	const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

	const onSelectChange = (newSelectedRowKeys: React.Key[]): void => {
		setSelectedRowKeys(newSelectedRowKeys);
	};

	const rowSelection = {
		selectedRowKeys,
		onChange: onSelectChange,
	};

	useEffect(() => {
		setColumnsData(columns);
		const visibleColumns = getVisibleColumns({
			tablesource,
			columnsData: columns,
			dynamicColumns,
		});
		setColumnsData((prevColumns) =>
			prevColumns
				? [
						...prevColumns.slice(0, prevColumns.length - 1),
						...visibleColumns,
						prevColumns[prevColumns.length - 1],
				  ]
				: undefined,
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [columns, dynamicColumns]);

	const onToggleHandler = (index: number) => (
		checked: boolean,
		event: React.MouseEvent<HTMLButtonElement>,
	): void => {
		event.stopPropagation();
		setVisibleColumns({
			tablesource,
			dynamicColumns,
			index,
			checked,
		});
		setColumnsData((prevColumns) =>
			getNewColumnData({
				checked,
				index,
				prevColumns,
				dynamicColumns,
			}),
		);
	};

	const items: MenuProps['items'] =
		dynamicColumns?.map((column, index) => ({
			label: (
				<div className="dynamicColumnsTable-items">
					<div>{column.title?.toString()}</div>
					<Switch
						checked={columnsData?.findIndex((c) => c.key === column.key) !== -1}
						onChange={onToggleHandler(index)}
					/>
				</div>
			),
			key: index,
			type: 'checkbox',
		})) || [];

	const hasSelected = selectedRowKeys.length > 0;

	const cancel = (
		e?: React.MouseEvent<HTMLElement, MouseEvent> | undefined,
	): void => {
		console.log(e);
	};

	return (
		<div className="dynamicColumnTable">
			<div className="dynamicColumeTableHeader">
				{multiRowActionsEnabled && hasSelected && (
					<div className="selectedRowActions">
						<span style={{ marginLeft: 8 }}>
							Selected {selectedRowKeys.length} alerts
						</span>

						{multiRowActionsEnabled &&
							multiRowActions &&
							multiRowActions.map((action) => (
								<Popconfirm
									key={action.key}
									title={action.title}
									description={action.description}
									icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
									placement="topRight"
									onConfirm={action.onConfirm}
									onCancel={cancel}
									okText="Yes"
								>
									<Button className="periscope-btn" size="middle" icon={action.btnIcon}>
										{action.btnText}
									</Button>
								</Popconfirm>
							))}
					</div>
				)}

				{dynamicColumns && (
					<Dropdown
						getPopupContainer={popupContainer}
						menu={{ items }}
						trigger={['click']}
					>
						<Button
							className="dynamicColumnTable-button filter-btn"
							size="middle"
							icon={<SlidersHorizontal size={14} />}
						/>
					</Dropdown>
				)}
			</div>

			<ResizeTable
				rowSelection={rowSelection}
				columns={columnsData}
				onDragColumn={onDragColumn}
				{...restProps}
			/>
		</div>
	);
}

DynamicColumnTable.defaultProps = {
	onDragColumn: undefined,
	multiRowActionsEnabled: false,
};

export default memo(DynamicColumnTable);
