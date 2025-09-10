import './LogsDownloadOptionsMenu.styles.scss';

import { Button, message, Radio, Typography } from 'antd';
import downloadExportData from 'api/v1/download/downloadExportData';
import { TelemetryFieldKey } from 'api/v5/v5';
import { Download } from 'lucide-react';
import { useState } from 'react';

import {
	DownloadColumnsScopes,
	DownloadFormats,
	DownloadRowCounts,
} from './constants';

function convertTelemetryFieldKeyToText(key: TelemetryFieldKey): string {
	const prefix = key.fieldContext ? `${key.fieldContext}.` : '';
	const suffix = key.fieldDataType ? `:${key.fieldDataType}` : '';
	return `${prefix}${key.name}${suffix}`;
}

interface LogsDownloadOptionsMenuProps {
	startTime: number;
	endTime: number;
	filter: string | null;
	columns: TelemetryFieldKey[];
	orderBy: string | null;
	onClose: () => void;
	onDownloadStart: () => void;
	onDownloadEnd: () => void;
	isDownloading: boolean;
}

export default function LogsDownloadOptionsMenu({
	startTime,
	endTime,
	filter,
	columns,
	orderBy,
	onClose,
	onDownloadStart,
	onDownloadEnd,
	isDownloading,
}: LogsDownloadOptionsMenuProps): JSX.Element {
	const [exportFormat, setExportFormat] = useState<string>(DownloadFormats.CSV);
	const [rowLimit, setRowLimit] = useState<number>(DownloadRowCounts.TEN_K);
	const [columnsScope, setColumnsScope] = useState<string>(
		DownloadColumnsScopes.ALL,
	);
	const handleExportRawData = async (): Promise<void> => {
		// Close the menu immediately when export is triggered
		onClose();
		onDownloadStart();
		try {
			const downloadOptions = {
				source: 'logs',
				start: startTime,
				end: endTime,
				...(columnsScope === DownloadColumnsScopes.SELECTED
					? { columns: columns.map((col) => convertTelemetryFieldKeyToText(col)) }
					: {}),
				filter,
				orderBy,
				format: exportFormat,
				limit: rowLimit,
			};

			await downloadExportData(downloadOptions);
			message.success('Export completed successfully');
		} catch (error) {
			console.error('Error exporting logs:', error);
			message.error('Failed to export logs. Please try again.');
		} finally {
			onDownloadEnd();
		}
	};

	return (
		<div
			className="export-options-container"
			role="dialog"
			aria-label="Export options"
			aria-modal="true"
		>
			<div className="export-format">
				<Typography.Text className="title">FORMAT</Typography.Text>
				<Radio.Group
					value={exportFormat}
					onChange={(e): void => setExportFormat(e.target.value)}
				>
					<Radio value={DownloadFormats.CSV}>csv</Radio>
					<Radio value={DownloadFormats.JSONL}>jsonl</Radio>
				</Radio.Group>
			</div>

			<div className="horizontal-line" />

			<div className="row-limit">
				<Typography.Text className="title">Number of Rows</Typography.Text>
				<Radio.Group
					value={rowLimit}
					onChange={(e): void => setRowLimit(e.target.value)}
				>
					<Radio value={DownloadRowCounts.TEN_K}>10k</Radio>
					<Radio value={DownloadRowCounts.THIRTY_K}>30k</Radio>
					<Radio value={DownloadRowCounts.FIFTY_K}>50k</Radio>
				</Radio.Group>
			</div>

			<div className="horizontal-line" />

			<div className="columns-scope">
				<Typography.Text className="title">Columns</Typography.Text>
				<Radio.Group
					value={columnsScope}
					onChange={(e): void => setColumnsScope(e.target.value)}
				>
					<Radio value={DownloadColumnsScopes.ALL}>All</Radio>
					<Radio value={DownloadColumnsScopes.SELECTED}>Selected</Radio>
				</Radio.Group>
			</div>

			<Button
				type="primary"
				icon={<Download size={14} />}
				onClick={handleExportRawData}
				className="export-button"
				disabled={isDownloading}
				loading={isDownloading}
			>
				<Typography.Text className="text">Export</Typography.Text>
			</Button>
		</div>
	);
}
