import { useCallback, useMemo, useState } from 'react';
import { Button, Popover, Tooltip } from 'antd';
import { RadioGroup, RadioGroupItem } from '@signozhq/ui/radio-group';
import { Typography } from '@signozhq/ui/typography';
import { TelemetryFieldKey } from 'api/v5/v5';
import { useExportRawData } from 'hooks/useDownloadOptionsMenu/useDownloadOptionsMenu';
import { Download, LoaderCircle } from '@signozhq/icons';
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
}

export default function DownloadOptionsMenu({
	dataSource,
	selectedColumns,
}: DownloadOptionsMenuProps): JSX.Element {
	const [exportFormat, setExportFormat] = useState<string>(DownloadFormats.CSV);
	const [rowLimit, setRowLimit] = useState<number>(DownloadRowCounts.TEN_K);
	const [columnsScope, setColumnsScope] = useState<string>(
		DownloadColumnsScopes.ALL,
	);
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

	const { isDownloading, handleExportRawData } = useExportRawData({
		dataSource,
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
					<RadioGroup value={exportFormat} onChange={setExportFormat}>
						<RadioGroupItem value={DownloadFormats.CSV}>csv</RadioGroupItem>
						<RadioGroupItem value={DownloadFormats.JSONL}>jsonl</RadioGroupItem>
					</RadioGroup>
				</div>

				<div className="horizontal-line" />

				<div className="row-limit">
					<Typography.Text className="title">Number of Rows</Typography.Text>
					<RadioGroup
						value={String(rowLimit)}
						onChange={(value): void => setRowLimit(Number(value))}
					>
						<RadioGroupItem value={String(DownloadRowCounts.TEN_K)}>
							10k
						</RadioGroupItem>
						<RadioGroupItem value={String(DownloadRowCounts.THIRTY_K)}>
							30k
						</RadioGroupItem>
						<RadioGroupItem value={String(DownloadRowCounts.FIFTY_K)}>
							50k
						</RadioGroupItem>
					</RadioGroup>
				</div>

				{dataSource !== DataSource.TRACES && (
					<>
						<div className="horizontal-line" />

						<div className="columns-scope">
							<Typography.Text className="title">Columns</Typography.Text>
							<RadioGroup value={columnsScope} onChange={setColumnsScope}>
								<RadioGroupItem value={DownloadColumnsScopes.ALL}>All</RadioGroupItem>
								<RadioGroupItem value={DownloadColumnsScopes.SELECTED}>
									Selected
								</RadioGroupItem>
							</RadioGroup>
						</div>
					</>
				)}

				<Button
					type="primary"
					icon={<Download size={16} />}
					onClick={handleExport}
					className="export-button"
					disabled={isDownloading}
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
					className="periscope-btn ghost"
					icon={
						isDownloading ? (
							<LoaderCircle size={14} className="animate-spin" />
						) : (
							<Download size={14} />
						)
					}
					data-testid={`periscope-btn-download-${dataSource}`}
					disabled={isDownloading}
				/>
			</Tooltip>
		</Popover>
	);
}
