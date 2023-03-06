import { ItemType } from 'antd/es/menu/hooks/useItems';
import { LogViewMode } from 'container/LogsTable';

export type ViewModeOption = ItemType & {
	label: string;
	value: LogViewMode;
};

export type SelectedLogViewData = {
	viewModeOptionList: ViewModeOption[];
	viewModeOption: ViewModeOption;
	viewMode: LogViewMode;
	handleViewModeChange: (s: LogViewMode) => void;
	handleViewModeOptionChange: ({ key }: { key: string }) => void;
	linesPerRow: number;
	handleLinesPerRowChange: (l: unknown) => void;
};
