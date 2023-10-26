/* eslint-disable react/jsx-props-no-spreading */
import './DynamicColumnTable.syles.scss';

import { SettingOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps, Switch } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { useState } from 'react';
import { popupContainer } from 'utils/selectPopupContainer';

import ResizeTable from './ResizeTable';
import { DynamicColumnTableProps } from './types';

function DynamicColumnTable({
	columns,
	dynamicColumns,
	onDragColumn,
	...restProps
}: DynamicColumnTableProps): JSX.Element {
	const [columnsData, setColumnsData] = useState<ColumnsType | undefined>(
		columns,
	);

	const onToggleHandler = (index: number) => (
		checked: boolean,
		event: React.MouseEvent<HTMLButtonElement>,
	): void => {
		event.stopPropagation();
		setColumnsData((prevColumns) => {
			if (checked && dynamicColumns) {
				return prevColumns
					? [
							...prevColumns.slice(0, prevColumns.length - 1),
							dynamicColumns[index],
							prevColumns[prevColumns.length - 1],
					  ]
					: undefined;
			}
			return prevColumns && dynamicColumns
				? prevColumns.filter(
						(column) => dynamicColumns[index].title !== column.title,
				  )
				: undefined;
		});
	};

	const items: MenuProps['items'] =
		dynamicColumns?.map((column, index) => ({
			label: (
				<div className="dynamicColumnsTable-items">
					<div>{column.title?.toString()}</div>
					<Switch onChange={onToggleHandler(index)} />
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

export default DynamicColumnTable;
