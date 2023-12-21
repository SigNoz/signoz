/* eslint-disable react/jsx-props-no-spreading */
import './DynamicColumnTable.syles.scss';

import { InfoCircleFilled, SettingOutlined } from '@ant-design/icons';
import { Button, Dropdown, Flex, MenuProps, Switch, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import ROUTES from 'constants/routes';
import { memo, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-use';
import { popupContainer } from 'utils/selectPopupContainer';

import ResizeTable from './ResizeTable';
import { DynamicColumnTableProps } from './types';
import {
	getNewColumnData,
	getVisibleColumns,
	setVisibleColumns,
} from './utils';

const upgradeURL =
	'https://signoz.io/docs/operate/migration/upgrade-0.36/#updating-query-payload-dashboards-and-alerts';

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
	}, [columns]);

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

	const location = useLocation();

	const isDashboardOrAlertsPage = useMemo(
		() =>
			location.pathname === ROUTES.LIST_ALL_ALERT ||
			location.pathname === ROUTES.ALL_DASHBOARD,
		[location.pathname],
	);

	return (
		<div className="DynamicColumnTable">
			{dynamicColumns && (
				<Flex justify="flex-end" align="center" gap={16}>
					{isDashboardOrAlertsPage && (
						<Typography.Text>
							<InfoCircleFilled /> We have made some changes in the naming convention
							of attributes. If you have built a log-based dashboard and alert before
							21 Dec, please follow this
							<a href={upgradeURL} target="_blank" type="link" rel="noreferrer">
								{' '}
								guide{' '}
							</a>
							or reach out to us for support.
						</Typography.Text>
					)}

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
				</Flex>
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
