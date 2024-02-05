/* eslint-disable react/jsx-props-no-spreading */
import './DynamicColumnTable.syles.scss';

import { SettingOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps, Switch } from 'antd';
import { ColumnsType } from 'antd/lib/table';
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
	...restProps
}: DynamicColumnTableProps): JSX.Element {
	const [columnsData, setColumnsData] = useState<ColumnsType | undefined>(
		columns,
	);

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

	return (
		<div className="DynamicColumnTable">
			{dynamicColumns && (
				<Dropdown
					getPopupContainer={popupContainer}
					menu={{ items }}
					trigger={['click']}
				>
					<Button
						className="dynamicColumnTable-button"
						size="middle"
						icon={<SettingOutlined />}
					/>
				</Dropdown>
			)}

			<ResizeTable
				columns={columnsData}
				onDragColumn={onDragColumn}
				{...restProps}
			/>
		</div>
	);
}

DynamicColumnTable.defaultProps = {
	onDragColumn: undefined,
};

export default memo(DynamicColumnTable);
