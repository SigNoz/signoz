import {
	ClipboardType,
	DatabaseZap,
	Info,
	LayoutList,
	Pyramid,
} from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { TabsList, TabsTrigger } from '@signozhq/ui/tabs';
import { Typography } from '@signozhq/ui/typography';
import TextToolTip from 'components/TextToolTip';

import styles from './VariableForm.module.scss';

/**
 * Presentational trigger row for the variable-type tabs (label + segmented
 * triggers). Must render inside a `TabsRoot`, which owns the active state and
 * change handling; the matching `TabsContent` panels are siblings in the root.
 */
function VariableTypeTabs(): JSX.Element {
	return (
		<div className={styles.typePicker}>
			<div className={styles.typeLabelContainer}>
				<Typography.Text className={styles.label}>Variable Type</Typography.Text>
				<TextToolTip
					text="Learn more about supported variable types"
					url="https://signoz.io/docs/userguide/manage-variables/#supported-variable-types"
					urlText="here"
					useFilledIcon={false}
					outlinedIcon={<Info size={14} />}
				/>
			</div>

			<div className={styles.typeTabsScroll}>
				<TabsList variant="secondary" className={styles.typeTabs}>
					<TabsTrigger
						value="DYNAMIC"
						className={styles.typeTab}
						testId="variable-type-dynamic"
					>
						<Pyramid size={14} />
						Dynamic
						<Badge color="robin" className={styles.betaTag}>
							Beta
						</Badge>
					</TabsTrigger>
					<TabsTrigger
						value="TEXT"
						className={styles.typeTab}
						testId="variable-type-textbox"
					>
						<ClipboardType size={14} />
						Textbox
					</TabsTrigger>
					<TabsTrigger
						value="CUSTOM"
						className={styles.typeTab}
						testId="variable-type-custom"
					>
						<LayoutList size={14} />
						Custom
					</TabsTrigger>
					<TabsTrigger
						value="QUERY"
						className={styles.typeTab}
						testId="variable-type-query"
					>
						<DatabaseZap size={14} />
						Query
						<Badge color="amber" className={styles.betaTag}>
							Not Recommended
						</Badge>
						<span
							className={styles.betaTag}
							onClick={(e): void => e.stopPropagation()}
							role="presentation"
						>
							<TextToolTip
								text="Learn why we don't recommend"
								url="https://signoz.io/docs/userguide/manage-variables/#why-avoid-clickhouse-query-variables"
								urlText="here"
								useFilledIcon={false}
								outlinedIcon={<Info size={14} />}
							/>
						</span>
					</TabsTrigger>
				</TabsList>
			</div>
		</div>
	);
}

export default VariableTypeTabs;
