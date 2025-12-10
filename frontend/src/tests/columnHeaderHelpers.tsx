import { InfoCircleOutlined } from '@ant-design/icons';
import { render } from '@testing-library/react';
import { Tooltip } from 'antd';
import { ColumnsType, ColumnType } from 'antd/es/table';
import {
	ColumnTitleIcon,
	ColumnTitleWrapper,
} from 'container/OptionsMenu/styles';
import { RowData } from 'lib/query/createTableColumnsFromQuery';

/**
 * Helper function that mimics ResizeTable's column title transformation logic.
 * This renders the column header the way it appears in the actual table when
 * onDragColumn is provided (which adds the tooltip icon for conflicting variants).
 *
 * Works with both ColumnType and ColumnsType column definitions.
 */
export const renderColumnHeader = <T extends RowData | Record<string, unknown>>(
	column: ColumnType<T> | ColumnsType<T>[number],
): ReturnType<typeof render> => {
	const columnRecord = column as Record<string, unknown>;
	const hasUnselectedConflict = columnRecord._hasUnselectedConflict === true;
	const titleText = column?.title?.toString() || '';

	return render(
		<ColumnTitleWrapper>
			{titleText}
			{hasUnselectedConflict && (
				<Tooltip title="The same column with a different type or context exists">
					<ColumnTitleIcon>
						<InfoCircleOutlined />
					</ColumnTitleIcon>
				</Tooltip>
			)}
		</ColumnTitleWrapper>,
	);
};
