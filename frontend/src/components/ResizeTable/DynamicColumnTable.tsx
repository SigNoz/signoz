/* eslint-disable react/jsx-props-no-spreading */
import './DynamicColumnTable.syles.scss';

import { Button, Dropdown, Flex, MenuProps, Switch } from 'antd';
import { ColumnGroupType, ColumnType } from 'antd/es/table';
import { ColumnsType } from 'antd/lib/table';
import logEvent from 'api/common/logEvent';
import LaunchChatSupport from 'components/LaunchChatSupport/LaunchChatSupport';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
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
	facingIssueBtn,
	shouldSendAlertsLogEvent,
	pagination,
	...restProps
}: DynamicColumnTableProps): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();

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

	const onToggleHandler = (
		index: number,
		column: ColumnGroupType<any> | ColumnType<any>,
	) => (checked: boolean, event: React.MouseEvent<HTMLButtonElement>): void => {
		event.stopPropagation();

		if (shouldSendAlertsLogEvent) {
			logEvent('Alert: Column toggled', {
				column: column?.title,
				action: checked ? 'Enable' : 'Disable',
			});
		}
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
						onChange={onToggleHandler(index, column)}
					/>
				</div>
			),
			key: index,
			type: 'checkbox',
		})) || [];

	// Get current page from URL or default to 1
	const currentPage = Number(urlQuery.get('page')) || 1;

	const handlePaginationChange = (page: number, pageSize?: number): void => {
		// Update URL with new page number while preserving other params
		urlQuery.set('page', page.toString());

		const newUrl = `${window.location.pathname}?${urlQuery.toString()}`;
		safeNavigate(newUrl);

		// Call original pagination handler if provided
		if (pagination?.onChange && !!pageSize) {
			pagination.onChange(page, pageSize);
		}
	};

	const enhancedPagination = {
		...pagination,
		current: currentPage, // Ensure the pagination component shows the correct page
		onChange: handlePaginationChange,
	};

	return (
		<div className="DynamicColumnTable">
			<Flex justify="flex-end" align="center" gap={8}>
				{facingIssueBtn && <LaunchChatSupport {...facingIssueBtn} />}
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
							data-testid="additional-filters-button"
						/>
					</Dropdown>
				)}
			</Flex>

			<ResizeTable
				columns={columnsData}
				onDragColumn={onDragColumn}
				pagination={enhancedPagination}
				{...restProps}
			/>
		</div>
	);
}

DynamicColumnTable.defaultProps = {
	onDragColumn: undefined,
};

export default memo(DynamicColumnTable);
