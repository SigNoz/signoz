import './TraceLoading.styles.scss';

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

export function TracesLoading(): JSX.Element {
	const { t } = useTranslation('trace');
	return (
		<div className="loading-traces">
			<div className="loading-traces-content">
				<img
					className="loading-gif"
					src="/Icons/loading-plane.gif"
					alt="wait-icon"
				/>

				<Typography>{t('trace_loading_placeholder')}</Typography>
			</div>
		</div>
	);
}
