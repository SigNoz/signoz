import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { ReactNode } from 'react';

import { TableRendererProps } from '../../types';

export const getTableColumnRenderer = ({
	columnName,
	renderFunction,
}: TableRendererProps): Record<string, (record: RowData) => ReactNode> => ({
	[columnName]: renderFunction,
});
