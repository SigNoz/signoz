import { ArrowLeft } from '@signozhq/icons';
import BreakoutOptions from 'container/QueryTable/Drilldown/BreakoutOptions';
import type { BreakoutAttributeType } from 'container/QueryTable/Drilldown/types';
import ContextMenu from 'periscope/components/ContextMenu';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import styles from './DrilldownBreakoutMenu.module.scss';

interface DrilldownBreakoutMenuProps {
	/** The clicked query's builder data — supplies the picker's available attributes. */
	queryData: IBuilderQuery;
	/** Regroup the clicked query by the picked attribute. */
	onBreakout: (groupBy: BreakoutAttributeType) => void;
	/** Return to the base aggregate menu. */
	onBack: () => void;
}

/**
 * The "Breakout by .." submenu — a back header + V1's read-only `BreakoutOptions` attribute picker,
 * wired to `onBreakout`.
 */
function DrilldownBreakoutMenu({
	queryData,
	onBreakout,
	onBack,
}: DrilldownBreakoutMenuProps): JSX.Element {
	return (
		<>
			<ContextMenu.Header>
				<div className={styles.header}>
					<ArrowLeft
						size={14}
						className={styles.backArrow}
						onClick={onBack}
						data-testid="drilldown-breakout-back"
					/>
					<span>Breakout by</span>
				</div>
			</ContextMenu.Header>
			<BreakoutOptions queryData={queryData} onColumnClick={onBreakout} />
		</>
	);
}

export default DrilldownBreakoutMenu;
