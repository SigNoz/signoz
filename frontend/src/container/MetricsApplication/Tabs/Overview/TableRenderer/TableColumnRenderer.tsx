import type { ReactNode } from 'react';
import type { RowData } from 'lib/query/createTableColumnsFromQuery';

import type { TableRendererProps } from '../../types';

export const getTableColumnRenderer = ({
	columnName,
	renderFunction,
}: TableRendererProps): Record<string, (record: RowData) => ReactNode> => ({
	[columnName]: renderFunction,
});
