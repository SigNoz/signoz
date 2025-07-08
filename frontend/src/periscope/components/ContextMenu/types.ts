import { CustomDataColumnType } from 'container/GridTableComponent/utils';
import { RowData } from 'lib/query/createTableColumnsFromQuery';

export interface ClickedData {
	record: RowData;
	column: CustomDataColumnType<RowData>;
	tableColumns?: CustomDataColumnType<RowData>[];
}

export interface Coordinates {
	x: number;
	y: number;
}

export interface PopoverPosition {
	left: number;
	top: number;
	placement:
		| 'top'
		| 'topLeft'
		| 'topRight'
		| 'bottom'
		| 'bottomLeft'
		| 'bottomRight'
		| 'left'
		| 'leftTop'
		| 'leftBottom'
		| 'right'
		| 'rightTop'
		| 'rightBottom';
}
