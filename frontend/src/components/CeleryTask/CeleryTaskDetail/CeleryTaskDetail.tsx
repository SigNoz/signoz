import './CeleryTaskDetail.style.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Divider, Drawer, Typography } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { X } from 'lucide-react';

import CeleryTaskGraph from '../CeleryTaskGraph/CeleryTaskGraph';
import { celerySlowestTasksTableWidgetData } from '../CeleryTaskGraph/CeleryTaskGraphUtils';

export type CeleryTaskData = {
	taskName: string;
	taskId: string;
	taskStatus: string;
	taskCreatedAt: string;
	taskCompletedAt: string;
};

export type CeleryTaskDetailProps = {
	task: CeleryTaskData | null;
	onClose: () => void;
};

export default function CeleryTaskDetail({
	task,
	onClose,
}: CeleryTaskDetailProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	return (
		<Drawer
			width="50%"
			title={
				<>
					<Divider type="vertical" />
					<Typography.Text className="title">{task?.taskName}</Typography.Text>
				</>
			}
			placement="right"
			onClose={onClose}
			open={!!task}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="celery-task-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{task && (
				<CeleryTaskGraph
					widgetData={celerySlowestTasksTableWidgetData}
					onClick={(): void => {}}
				/>
			)}
		</Drawer>
	);
}
