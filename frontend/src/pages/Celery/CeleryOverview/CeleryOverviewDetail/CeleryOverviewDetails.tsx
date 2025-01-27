import './CeleryOverviewDetails.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Divider, Drawer, Typography } from 'antd';
import { RowData } from 'components/CeleryOverview/CeleryOverviewTable/CeleryOverviewTable';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { X } from 'lucide-react';

import OverviewRightPanelGraph from './OverviewRightPanelGraph';
import ValueInfo from './ValueInfo';

export default function CeleryOverviewDetails({
	details,
	onClose,
}: {
	details: RowData;
	onClose: () => void;
}): JSX.Element {
	const isDarkMode = useIsDarkMode();
	console.log(details);

	return (
		<Drawer
			width="60%"
			title={
				<div>
					<Typography.Text className="title">{details.service_name}</Typography.Text>
					<div>
						<Typography.Text className="subtitle">
							{details.span_name}
						</Typography.Text>
						<Divider type="vertical" />
						<Typography.Text className="subtitle">
							{details.messaging_system}
						</Typography.Text>
						<Divider type="vertical" />
						<Typography.Text className="subtitle">
							{details.destination}
						</Typography.Text>
						<Divider type="vertical" />
						<Typography.Text className="subtitle">
							{details.kind_string}
						</Typography.Text>
					</div>
				</div>
			}
			placement="right"
			onClose={onClose}
			open={!!details}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="celery-task-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			<div className="celery-overview-detail-container">
				<ValueInfo />
				<OverviewRightPanelGraph />
			</div>
		</Drawer>
	);
}
