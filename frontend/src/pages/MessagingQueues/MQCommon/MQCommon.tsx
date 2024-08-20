import './MQCommon.styles.scss';

import { Tooltip } from 'antd';
import { Info } from 'lucide-react';

export function ComingSoon(): JSX.Element {
	return (
		<Tooltip
			title="Contact us at cloud-support@signoz.io for more details."
			placement="top"
			overlayClassName="tooltip-overlay"
		>
			<div className="coming-soon">
				<div className="coming-soon__text">Coming Soon</div>
				<div className="coming-soon__icon">
					<Info size={10} color="var(--bg-sienna-400)" />
				</div>
			</div>
		</Tooltip>
	);
}
