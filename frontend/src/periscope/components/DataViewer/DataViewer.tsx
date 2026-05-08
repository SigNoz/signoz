import { useMemo, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { ChevronDown, Copy } from '@signozhq/icons';
import { Button, Dropdown, toast } from '@signozhq/ui';
import { JsonView } from 'periscope/components/JsonView';
import { PrettyView } from 'periscope/components/PrettyView';
import { PrettyViewProps } from 'periscope/components/PrettyView';

import './DataViewer.styles.scss';

type ViewMode = 'pretty' | 'json';

const VIEW_MODE_OPTIONS: { label: string; value: ViewMode }[] = [
	{ label: 'Pretty', value: 'pretty' },
	{ label: 'JSON', value: 'json' },
];

export interface DataViewerProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data: Record<string, any>;
	drawerKey?: string;
	prettyViewProps?: Omit<PrettyViewProps, 'data' | 'drawerKey'>;
}

function DataViewer({
	data,
	drawerKey = 'default',
	prettyViewProps,
}: DataViewerProps): JSX.Element {
	const [viewMode, setViewMode] = useState<ViewMode>('pretty');
	const [, setCopy] = useCopyToClipboard();

	const jsonString = useMemo(() => JSON.stringify(data, null, 2), [data]);

	const handleCopy = (): void => {
		const text = JSON.stringify(data, null, 2);
		setCopy(text);
		toast.success('Copied to clipboard', {
			position: 'top-right',
		});
	};

	const currentLabel =
		VIEW_MODE_OPTIONS.find((opt) => opt.value === viewMode)?.label ?? 'Pretty';

	return (
		<div className="data-viewer">
			<div className="data-viewer__toolbar">
				<Dropdown
					align="start"
					className="data-viewer__mode-dropdown"
					menu={{
						items: [
							{
								type: 'radio-group',
								value: viewMode,
								onChange: (value): void => setViewMode(value as ViewMode),
								children: VIEW_MODE_OPTIONS.map((opt) => ({
									type: 'radio',
									key: opt.value,
									value: opt.value,
									label: opt.label,
								})),
							},
						],
					}}
				>
					<Button
						variant="outlined"
						size="sm"
						color="secondary"
						className="data-viewer__mode-select"
						suffix={<ChevronDown size={12} />}
					>
						{currentLabel}
					</Button>
				</Dropdown>
				<button
					type="button"
					className="data-viewer__copy-btn"
					onClick={handleCopy}
					aria-label="Copy JSON"
				>
					<Copy size={14} />
				</button>
			</div>

			<div className="data-viewer__content">
				{viewMode === 'pretty' && (
					<PrettyView data={data} drawerKey={drawerKey} {...prettyViewProps} />
				)}
				{viewMode === 'json' && <JsonView data={jsonString} />}
			</div>
		</div>
	);
}

export default DataViewer;
