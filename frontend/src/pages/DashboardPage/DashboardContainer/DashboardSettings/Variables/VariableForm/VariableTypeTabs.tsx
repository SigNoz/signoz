import { ReactNode } from 'react';
import { Color } from '@signozhq/design-tokens';
import {
	ClipboardType,
	DatabaseZap,
	Info,
	LayoutList,
	Pyramid,
} from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { Tabs } from '@signozhq/ui/tabs';
import { Typography } from '@signozhq/ui/typography';
import TextToolTip from 'components/TextToolTip';

import type { VariableType } from '../variableFormModel';
import styles from './VariableForm.module.scss';

interface VariableTypeTabsProps {
	value: VariableType;
	onChange: (type: VariableType) => void;
	panels: Record<VariableType, ReactNode>;
}

/**
 * Variable-type bar plus the active type's panel. The parent owns `value` and
 * supplies the panel for each type.
 */
function VariableTypeTabs({
	value,
	onChange,
	panels,
}: VariableTypeTabsProps): JSX.Element {
	return (
		<Tabs
			variant="secondary"
			orientation="horizontal"
			alignment="end"
			className={styles.typeSection}
			value={value}
			onChange={(next): void => onChange(next as VariableType)}
			noTabContentPadding
			tabBarStartContent={
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
			}
			items={[
				{
					key: 'DYNAMIC',
					label: 'Dynamic',
					prefixIcon: <Pyramid size={14} />,
					suffixIcon: (
						<Badge variant="solid" color="primary" className={styles.betaTag}>
							Beta
						</Badge>
					),
					testId: 'variable-type-dynamic',
					children: panels.DYNAMIC,
				},
				{
					key: 'TEXT',
					label: 'Textbox',
					prefixIcon: <ClipboardType size={14} />,
					testId: 'variable-type-textbox',
					children: panels.TEXT,
				},
				{
					key: 'CUSTOM',
					label: 'Custom',
					prefixIcon: <LayoutList size={14} />,
					testId: 'variable-type-custom',
					children: panels.CUSTOM,
				},
				{
					key: 'QUERY',
					label: 'Query',
					prefixIcon: <DatabaseZap size={14} />,
					suffixIcon: (
						<>
							<Badge
								variant="solid"
								color="warning"
								className={styles.notRecommendedBadge}
							>
								Not Recommended
							</Badge>
							<span
								className={styles.notRecommendedInfo}
								onClick={(e): void => e.stopPropagation()}
								role="presentation"
							>
								<TextToolTip
									text="Query variables can be slow and brittle, so they aren't recommended. Learn why"
									url="https://signoz.io/docs/userguide/manage-variables/#why-avoid-clickhouse-query-variables"
									urlText="here"
									useFilledIcon={false}
									outlinedIcon={<Info size={14} color={Color.BG_AMBER_600} />}
								/>
							</span>
						</>
					),
					testId: 'variable-type-query',
					children: panels.QUERY,
				},
			]}
		/>
	);
}

export default VariableTypeTabs;
