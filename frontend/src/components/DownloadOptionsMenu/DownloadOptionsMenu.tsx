import { useCallback, useMemo, useState } from 'react';
import { Popover, Tooltip } from 'antd';
import { Button } from '@signozhq/ui/button';
import { RadioGroup } from '@signozhq/ui/radio-group';
import { Typography } from '@signozhq/ui/typography';
import { TelemetryFieldKey } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useExportRawData } from 'hooks/useExportData/useServerExport';
import { Download } from '@signozhq/icons';
import { DataSource } from 'types/common/queryBuilder';

import {
	DownloadColumnsScopes,
	DownloadFormats,
	DownloadRowCounts,
} from './constants';

import './DownloadOptionsMenu.styles.scss';

interface DownloadOptionsMenuProps {
	dataSource: DataSource;
	selectedColumns?: TelemetryFieldKey[];
	panelType?: PANEL_TYPES;
}

export default function DownloadOptionsMenu({
	dataSource,
	selectedColumns,
	panelType,
}: DownloadOptionsMenuProps): JSX.Element {
	const [exportFormat, setExportFormat] = useState<string>(DownloadFormats.CSV);
	const [rowLimit, setRowLimit] = useState<number>(DownloadRowCounts.TEN_K);
	const [columnsScope, setColumnsScope] = useState<string>(
		DownloadColumnsScopes.ALL,
	);
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

	const { isDownloading, handleExportRawData } = useExportRawData({
		dataSource,
		panelType,
	});

	const handleExport = useCallback(async (): Promise<void> => {
		setIsPopoverOpen(false);
		await handleExportRawData({
			format: exportFormat,
			rowLimit,
			clearSelectColumns:
				dataSource !== DataSource.TRACES &&
				columnsScope === DownloadColumnsScopes.ALL,
			selectedColumns,
		});
	}, [
		exportFormat,
		rowLimit,
		columnsScope,
		selectedColumns,
		handleExportRawData,
		dataSource,
	]);

	const popoverContent = useMemo(
		() => (
			<div
				className="export-options-container"
				role="dialog"
				aria-label="Export options"
				aria-modal="true"
			>
				<div className="export-format">
					<Typography.Text className="title">FORMAT</Typography.Text>
					<RadioGroup
						color="primary"
						value={exportFormat}
						onChange={setExportFormat}
						items={[
							{ value: DownloadFormats.CSV, label: 'csv' },
							{ value: DownloadFormats.JSONL, label: 'jsonl' },
						]}
					/>
				</div>

				<div className="horizontal-line" />

				<div className="row-limit">
					<Typography.Text className="title">Number of Rows</Typography.Text>
					<RadioGroup
						color="primary"
						value={String(rowLimit)}
						onChange={(value): void => setRowLimit(Number(value))}
						items={[
							{ value: String(DownloadRowCounts.TEN_K), label: '10k' },
							{ value: String(DownloadRowCounts.THIRTY_K), label: '30k' },
							{ value: String(DownloadRowCounts.FIFTY_K), label: '50k' },
						]}
					/>
				</div>

				{dataSource !== DataSource.TRACES && (
					<>
						<div className="horizontal-line" />

						<div className="columns-scope">
							<Typography.Text className="title">Columns</Typography.Text>
							<RadioGroup
								color="primary"
								value={columnsScope}
								onChange={setColumnsScope}
								items={[
									{ value: DownloadColumnsScopes.ALL, label: 'All' },
									{ value: DownloadColumnsScopes.SELECTED, label: 'Selected' },
								]}
							/>
						</div>
					</>
				)}

				<Button
					variant="solid"
					color="primary"
					prefix={<Download size={16} />}
					size="md"
					width="100%"
					onClick={handleExport}
					loading={isDownloading}
				>
					Export
				</Button>
			</div>
		),
		[
			exportFormat,
			rowLimit,
			columnsScope,
			isDownloading,
			handleExport,
			dataSource,
		],
	);

	return (
		<Popover
			content={popoverContent}
			trigger="click"
			placement="bottomRight"
			arrow={false}
			open={isPopoverOpen}
			onOpenChange={setIsPopoverOpen}
			rootClassName="download-popover"
		>
			<Tooltip title="Download" placement="top">
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					aria-label="Download"
					testId={`periscope-btn-download-${dataSource}`}
					loading={isDownloading}
				>
					<Download size={14} />
				</Button>
			</Tooltip>
		</Popover>
	);
}
