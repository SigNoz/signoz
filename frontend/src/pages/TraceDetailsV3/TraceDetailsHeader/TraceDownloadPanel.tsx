import { useEffect } from 'react';
import { Button } from '@signozhq/ui/button';
import { Progress } from '@signozhq/ui/progress';
import { LoaderCircle, X } from '@signozhq/icons';
import { FloatingPanel } from 'periscope/components/FloatingPanel';

import { useTraceDownloadStore } from './traceDownloadStore';

import styles from './TraceDownloadPanel.module.scss';

const PANEL_WIDTH = 356;
const PANEL_HEIGHT = 76;

function TraceDownloadPanel(): JSX.Element {
	const isDownloading = useTraceDownloadStore((s) => s.isDownloading);
	const progress = useTraceDownloadStore((s) => s.progress);
	const cancelDownload = useTraceDownloadStore((s) => s.cancelDownload);

	useEffect(() => cancelDownload, [cancelDownload]);

	const displayProgress = Math.max(1, progress);

	return (
		<FloatingPanel
			isOpen={isDownloading}
			width={PANEL_WIDTH}
			height={PANEL_HEIGHT}
			minWidth={PANEL_WIDTH}
			minHeight={PANEL_HEIGHT}
			enableResizing={false}
		>
			<div className={styles.downloadPanel} data-testid="trace-download-panel">
				<div className={`${styles.header} floating-panel__drag-handle`}>
					<span className={styles.title}>
						Downloading trace
						<LoaderCircle size={14} className={`animate-spin ${styles.loader}`} />
					</span>
					<span className={styles.percent} data-testid="trace-download-percent">
						{displayProgress}%
					</span>
					<Button
						variant="ghost"
						size="icon"
						color="secondary"
						className={styles.cancelBtn}
						onClick={cancelDownload}
						aria-label="Cancel download"
						data-testid="trace-download-cancel"
						prefix={<X size={16} />}
					/>
				</div>
				<Progress percent={displayProgress} status="active" showInfo={false} />
			</div>
		</FloatingPanel>
	);
}

export default TraceDownloadPanel;
