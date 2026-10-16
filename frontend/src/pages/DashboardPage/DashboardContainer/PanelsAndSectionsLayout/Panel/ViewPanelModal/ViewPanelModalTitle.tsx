import { Tooltip } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';

import { usePanelTitle } from '../hooks/usePanelTitle';
import styles from './ViewPanelModal.module.scss';

interface ViewPanelModalTitleProps {
	panel: DashboardtypesPanelDTO;
}

function ViewPanelModalTitle({ panel }: ViewPanelModalTitleProps): JSX.Element {
	const name = usePanelTitle(panel);

	return (
		<Tooltip title={name}>
			<Typography.Text className={styles.title}>
				{name ? `${name} - (View mode)` : 'View mode'}
			</Typography.Text>
		</Tooltip>
	);
}

export default ViewPanelModalTitle;
