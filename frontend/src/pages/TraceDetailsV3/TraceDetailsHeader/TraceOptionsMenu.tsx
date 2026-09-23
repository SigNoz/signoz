import { Settings2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { ExportFormat } from 'lib/exportData/types';

import { useTraceStore } from '../stores/traceStore';
import { useDownloadTrace } from './useDownloadTrace';

import styles from './TraceOptionsMenu.module.scss';

interface TraceOptionsMenuProps {
	showTraceDetails: boolean;
	onToggleTraceDetails: () => void;
	onOpenPreviewFields: () => void;
	traceId: string;
	startTime: number;
	endTime: number;
	totalSpansCount: number;
}

function TraceOptionsMenu({
	showTraceDetails,
	onToggleTraceDetails,
	onOpenPreviewFields,
	traceId,
	startTime,
	endTime,
	totalSpansCount,
}: TraceOptionsMenuProps): JSX.Element {
	const colorByField = useTraceStore((s) => s.colorByField);
	const setColorByField = useTraceStore((s) => s.setColorByField);
	const availableColorByOptions = useTraceStore(
		(s) => s.availableColorByOptions,
	);

	const { isDownloading, isExportDisabled, downloadTrace } = useDownloadTrace({
		traceId,
		startTime,
		endTime,
		totalSpansCount,
	});

	const handleColorByChange = (name: string): void => {
		const next = availableColorByOptions.find((o) => o.field.name === name);
		if (next) {
			setColorByField(next.field);
		}
	};

	const items: DropdownItemType[] = [
		{
			type: 'item',
			value: 'toggle-trace-details',
			label: showTraceDetails ? 'Hide trace details' : 'Show trace details',
			onClick: onToggleTraceDetails,
		},
		{
			type: 'item',
			value: 'preview-fields',
			label: 'Preview fields',
			onClick: onOpenPreviewFields,
		},
	];

	// Only show the "Colour by" submenu if there's an actual choice to make.
	if (availableColorByOptions.length > 1) {
		items.push({
			type: 'submenu',
			value: 'colour-by',
			label: 'Colour by',
			items: [
				{
					type: 'group',
					value: 'colour-by-options',
					label: 'Colour by',
					items: [
						{
							type: 'radio-group',
							name: 'colour-by',
							value: colorByField.name,
							onChange: handleColorByChange,
							items: availableColorByOptions.map((opt) => ({
								value: opt.field.name,
								label: opt.label,
							})),
						},
					],
				},
			],
		});
	}

	if (!isExportDisabled) {
		items.push({
			type: 'submenu',
			value: 'download-trace',
			label: 'Download trace',
			testId: 'download-trace-submenu',
			disabled: isDownloading,
			disabledTooltip: undefined,
			items: [
				{
					type: 'item',
					value: 'csv',
					label: 'CSV',
					testId: 'download-trace-csv',
					onClick: (): void => {
						downloadTrace(ExportFormat.Csv);
					},
				},
				{
					type: 'item',
					value: 'jsonl',
					label: 'JSONL',
					testId: 'download-trace-jsonl',
					onClick: (): void => {
						downloadTrace(ExportFormat.Jsonl);
					},
				},
			],
		});
	}

	return (
		<Dropdown
			items={items}
			nativeButton
			align="start"
			side="bottom"
			className={styles.traceOptionsDropdown}
		>
			<Button
				variant="ghost"
				size="sm"
				icon
				color="secondary"
				aria-label="Trace options"
			>
				<Settings2 size={14} />
			</Button>
		</Dropdown>
	);
}

export default TraceOptionsMenu;
