import './CeleryTask.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Tooltip } from 'antd';
import CeleryTaskConfigOptions from 'components/CeleryTask/CeleryTaskConfigOptions/CeleryTaskConfigOptions';
import CeleryTaskDetail, {
	CaptureDataProps,
} from 'components/CeleryTask/CeleryTaskDetail/CeleryTaskDetail';
import CeleryTaskGraphGrid from 'components/CeleryTask/CeleryTaskGraph/CeleryTaskGraphGrid';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useCopyToClipboard } from 'react-use';

export default function CeleryTask(): JSX.Element {
	const [task, setTask] = useState<CaptureDataProps | null>(null);

	const onTaskClick = (captureData: CaptureDataProps): void => {
		setTask(captureData);
	};

	const [isURLCopied, setIsURLCopied] = useState(false);

	const [, handleCopyToClipboard] = useCopyToClipboard();

	return (
		<div className="celery-task-container">
			<div className="celery-content">
				<div className="celery-content-header">
					<p className="celery-content-header-title">Celery</p>
					<div className="celery-content-header-right">
						<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
						<Tooltip title="Share this" arrow={false}>
							<Button
								className="periscope-btn copy-url-btn"
								onClick={(): void => {
									handleCopyToClipboard(window.location.href);
									setIsURLCopied(true);
									setTimeout(() => {
										setIsURLCopied(false);
									}, 1000);
								}}
								icon={
									isURLCopied ? (
										<Check size={14} color={Color.BG_FOREST_500} />
									) : (
										<Share2 size={14} />
									)
								}
							/>
						</Tooltip>
					</div>
				</div>
				<CeleryTaskGraphGrid
					onClick={onTaskClick}
					queryEnabled={!task}
					configureOptionComponent={<CeleryTaskConfigOptions />}
				/>
			</div>
			{!!task && (
				<CeleryTaskDetail
					onClose={(): void => {
						setTask(null);
					}}
					widgetData={task.widgetData}
					taskData={task}
					drawerOpen={!!task}
				/>
			)}
		</div>
	);
}
