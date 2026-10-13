import { Spin } from 'antd';
import { Loader } from '@signozhq/icons';

import styles from './PanelLoader.module.scss';

interface PanelLoaderProps {
	'data-testid'?: string;
}

/** Centred full-panel spinner shown while a query is in flight with nothing to display yet. */
function PanelLoader({
	'data-testid': testId = 'panel-loading',
}: PanelLoaderProps): JSX.Element {
	return (
		<div className={styles.loader} data-testid={testId}>
			<Spin indicator={<Loader size={14} className="animate-spin" />} />
		</div>
	);
}

export default PanelLoader;
