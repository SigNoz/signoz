import { Color } from '@signozhq/design-tokens';
import { IConfigConnectionStatus } from 'container/Integrations/types';
import { CheckCircle, TriangleAlert } from 'lucide-react';

import './ConfigConnectionStatus.styles.scss';

export function ConfigConnectionStatus({
	status,
}: {
	status: IConfigConnectionStatus[] | null;
}): JSX.Element {
	return (
		<div className="config-connection-status-container">
			{status?.map((status) => (
				<div key={status.category} className="config-connection-status-item">
					<div className="config-connection-status-icon">
						{status.last_received_ts_ms && status.last_received_ts_ms > 0 ? (
							<CheckCircle size={16} color={Color.BG_FOREST_500} />
						) : (
							<TriangleAlert size={16} color={Color.BG_AMBER_500} />
						)}
					</div>
					<div className="config-connection-status-category-display-name">
						{status.category_display_name}
					</div>
				</div>
			))}
		</div>
	);
}
