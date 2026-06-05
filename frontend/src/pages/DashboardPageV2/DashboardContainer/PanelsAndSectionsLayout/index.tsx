import { ReactNode, useMemo } from 'react';

import { Empty } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import type {
	DashboardtypesLayoutDTO,
	DashboardtypesPanelDTO,
} from 'api/generated/services/sigNoz.schemas';

import { useDashboardStore } from '../store/useDashboardStore';
import { layoutsToSections } from '../utils';
import AddSectionControl from './Section/AddSectionControl/AddSectionControl';
import Section from './Section/Section/Section';
import SectionList from './Section/SectionList';
import styles from './PanelsAndSectionsLayout.module.scss';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface Props {
	layouts: DashboardtypesLayoutDTO[];
	panels: Record<string, DashboardtypesPanelDTO | undefined>;
}

function PanelsAndSectionsLayout({ layouts, panels }: Props): JSX.Element {
	const isEditable = useDashboardStore((s) => s.isEditable);

	const sections = useMemo(
		() => layoutsToSections(layouts, panels),
		[layouts, panels],
	);

	const isEmpty =
		sections.length === 0 || sections.every((s) => s.items.length === 0);

	// Sectioned mode = at least one titled layout. Sections then become a
	// reorderable list; otherwise the dashboard is a single free-flowing grid
	// with no section chrome or reordering.
	const isSectioned = useMemo(() => sections.some((s) => !!s.title), [sections]);

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

		if (isSectioned) {
			return <SectionList sections={sections} layouts={layouts} />;
		}

		return sections.map((section) => (
			<Section key={section.id} section={section} />
		));
	};

	return (
		<div className={styles.body}>
			{renderContent()}
			{isEditable ? (
				<AddSectionControl
					sections={sections}
					layouts={layouts}
					isSectioned={isSectioned}
				/>
			) : null}
		</div>
	);
}

export default PanelsAndSectionsLayout;
