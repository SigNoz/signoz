import { useMemo, useState } from 'react';
import { ChevronDown } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple as Dropdown } from '@signozhq/ui/dropdown-menu';
import logEvent from 'api/common/logEvent';
import CopyButton from 'periscope/components/CopyButton/CopyButton';
import { JsonView } from 'periscope/components/JsonView';
import { PrettyView, PrettyViewProps } from 'periscope/components/PrettyView';

import './DataViewer.styles.scss';

type ViewMode = 'pretty' | 'json';

const VIEW_MODE_CHANGED_EVENT = 'Data Viewer: View mode changed';

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

	const jsonString = useMemo(() => JSON.stringify(data, null, 2), [data]);

	const handleViewModeChange = (value: string): void => {
		const next = value as ViewMode;
		setViewMode(next);
		try {
			logEvent(VIEW_MODE_CHANGED_EVENT, {
				viewMode: next,
				path: window.location.pathname,
				drawerKey,
			});
		} catch {
			// No op
		}
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
								onChange: handleViewModeChange,
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
				<CopyButton value={jsonString} ariaLabel="Copy JSON" />
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
