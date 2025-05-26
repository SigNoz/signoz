import './StepsHeader.styles.scss';

import { Divider } from 'antd';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';

function StepsHeader(): JSX.Element {
	return (
		<div className="steps-header">
			<div className="steps-header__label">FUNNEL STEPS</div>
			<div className="steps-header__divider">
				<Divider dashed />
			</div>
			<div className="steps-header__time-range">
				<DateTimeSelectionV2
					showAutoRefresh={false}
					showRefreshText={false}
					hideShareModal
				/>
			</div>
		</div>
	);
}

export default StepsHeader;
