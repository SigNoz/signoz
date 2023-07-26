import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { ReactNode } from 'react';

import { TableRendererProps } from '../../types';
import ColumnWithLink from './ColumnWithLink';

export const TableColumnRenderer = ({
	servicename,
	minTime,
	maxTime,
	selectedTraceTags,
}: TableRendererProps): Record<string, (record: RowData) => ReactNode> => ({
	operation: (record: RowData): ReactNode => (
		<ColumnWithLink
			servicename={servicename}
			minTime={minTime}
			maxTime={maxTime}
			selectedTraceTags={selectedTraceTags}
			record={record}
		/>
	),
});
