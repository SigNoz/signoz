import { ReactNode, useMemo } from 'react';

import { Empty } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import type {
	DashboardtypesLayoutDTO,
	DashboardtypesPanelDTO,
} from 'api/generated/services/sigNoz.schemas';

import { layoutsToSections } from '../utils';
import Section from './Section/Section/Section';
import styles from './PanelsAndSectionsLayout.module.scss';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface Props {
	layouts: DashboardtypesLayoutDTO[];
	panels: Record<string, DashboardtypesPanelDTO | undefined>;
}

function PanelsAndSectionsLayout({ layouts, panels }: Props): JSX.Element {
	const sections = useMemo(
		() => layoutsToSections(layouts, panels),
		[layouts, panels],
	);

	const isEmpty =
		sections.length === 0 || sections.every((s) => s.items.length === 0);

	const renderContent = (): ReactNode => {
		if (isEmpty) {
			return (
				<div className={styles.emptyState}>
					<Empty
						image={Empty.PRESENTED_IMAGE_SIMPLE}
						description={
							<Typography.Text>No panels in this dashboard yet</Typography.Text>
						}
					/>
				</div>
			);
		}

		return sections.map((section) => (
			<Section key={section.id} section={section} />
		));
	};

	return <div className={styles.body}>{renderContent()}</div>;
}

export default PanelsAndSectionsLayout;
