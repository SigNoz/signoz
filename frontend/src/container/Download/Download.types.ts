import type { TableColumnsType } from 'antd';
import type { RowData } from 'lib/query/createTableColumnsFromQuery';

export type DownloadFileName = string | (() => string);

export type DownloadOptions = {
	isDownloadEnabled: boolean;
	fileName: DownloadFileName;
	placement?: 'overlay' | 'block';
	dataFormatter?: (
		inputData: RowData[],
		columns?: TableColumnsType<RowData>,
	) => Record<string, string>[];
	isDataDownloadable?: (data: Record<string, string>[]) => boolean;
};

export type DownloadProps = {
	data: Record<string, string>[];
	isLoading?: boolean;
	fileName: DownloadFileName;
};
