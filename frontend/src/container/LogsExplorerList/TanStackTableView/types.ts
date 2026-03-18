import { ReactElement } from 'react';
import { ColumnSizingState } from '@tanstack/react-table';
import { ILog } from 'types/api/logs/log';

export type TableRecord = Record<string, unknown>;

export type LegacyCellResult =
	| {
			props?: Record<string, unknown>;
			children?: ReactElement;
	  }
	| ReactElement
	| string
	| number
	| null
	| undefined;

export type LegacyColumn = {
	key?: string | number;
	title?: string;
	render?: (
		value: unknown,
		record: TableRecord,
		index: number,
	) => LegacyCellResult;
};

export type OrderedColumn = LegacyColumn & {
	key: string | number;
};

export type TanStackTableRowData = {
	log: TableRecord;
	currentLog: ILog;
	rowIndex: number;
};

export type PersistedColumnSizing = {
	version: 1;
	columnIdsSignature: string;
	sizing: ColumnSizingState;
};
