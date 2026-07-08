import { useMemo, useState } from 'react';
import { ToggleGroupSimple } from '@signozhq/ui/toggle-group';
import logEvent from 'api/common/logEvent';
import CopyButton from 'periscope/components/CopyButton/CopyButton';
import { JsonView } from 'periscope/components/JsonView';
import { PrettyView, PrettyViewProps } from 'periscope/components/PrettyView';

import './DataViewer.styles.scss';

enum ViewMode {
	Pretty = 'pretty',
	Json = 'json',
}

const VIEW_MODE_CHANGED_EVENT = 'Data Viewer: View mode changed';

const VIEW_MODE_OPTIONS: { label: string; value: ViewMode }[] = [
	{ label: 'Pretty', value: ViewMode.Pretty },
	{ label: 'JSON', value: ViewMode.Json },
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
	const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Pretty);

	const jsonString = useMemo(() => JSON.stringify(data, null, 2), [data]);

	const handleViewModeChange = (value: string): void => {
		const next = value as ViewMode;
		// A single-select toggle can emit '' when the active item is toggled off;
		// ignore it so one mode is always selected.
		if (next !== ViewMode.Pretty && next !== ViewMode.Json) {
			return;
		}
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

	return (
		<div className="data-viewer">
			<div className="data-viewer__toolbar">
				<ToggleGroupSimple
					type="single"
					size="sm"
					value={viewMode}
					onChange={handleViewModeChange}
					items={VIEW_MODE_OPTIONS}
					testId="data-viewer-view-mode"
				/>
				<CopyButton value={jsonString} ariaLabel="Copy JSON" />
			</div>

			<div className="data-viewer__content">
				{viewMode === ViewMode.Pretty && (
					<PrettyView data={data} drawerKey={drawerKey} {...prettyViewProps} />
				)}
				{viewMode === ViewMode.Json && <JsonView data={jsonString} />}
			</div>
		</div>
	);
}

export default DataViewer;
