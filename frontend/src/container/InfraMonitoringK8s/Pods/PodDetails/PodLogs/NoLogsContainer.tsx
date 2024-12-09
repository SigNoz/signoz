import { Color } from '@signozhq/design-tokens';
import { Typography } from 'antd';
import { Ghost } from 'lucide-react';

const { Text } = Typography;

export default function NoLogsContainer(): React.ReactElement {
	return (
		<div className="no-logs-found">
			<Text type="secondary">
				<Ghost size={24} color={Color.BG_AMBER_500} /> No logs found for this host
				in the selected time range.
			</Text>
		</div>
	);
}
