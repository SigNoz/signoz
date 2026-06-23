import {
	ClipboardType,
	DatabaseZap,
	Info,
	LayoutList,
	Pyramid,
} from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import TextToolTip from 'components/TextToolTip';

import type { VariableType } from '../variableModel';
import styles from './VariableForm.module.scss';

interface VariableTypeSelectorProps {
	value: VariableType;
	onChange: (type: VariableType) => void;
}

/** The segmented Dynamic / Textbox / Custom / Query type picker. */
function VariableTypeSelector({
	value,
	onChange,
}: VariableTypeSelectorProps): JSX.Element {
	return (
		<div className={cx(styles.row, styles.typeSection)}>
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
			<div className={styles.typeBtnGroup}>
				<Button
					variant="ghost"
					color="secondary"
					prefix={<Pyramid size={14} />}
					className={cx(styles.typeBtn, {
						[styles.typeBtnSelected]: value === 'DYNAMIC',
					})}
					onClick={(): void => onChange('DYNAMIC')}
					testId="variable-type-dynamic"
				>
					Dynamic
					<Badge color="robin" className={styles.betaTag}>
						Beta
					</Badge>
				</Button>
				<Button
					variant="ghost"
					color="secondary"
					prefix={<ClipboardType size={14} />}
					className={cx(styles.typeBtn, {
						[styles.typeBtnSelected]: value === 'TEXT',
					})}
					onClick={(): void => onChange('TEXT')}
					testId="variable-type-textbox"
				>
					Textbox
				</Button>
				<Button
					variant="ghost"
					color="secondary"
					prefix={<LayoutList size={14} />}
					className={cx(styles.typeBtn, {
						[styles.typeBtnSelected]: value === 'CUSTOM',
					})}
					onClick={(): void => onChange('CUSTOM')}
					testId="variable-type-custom"
				>
					Custom
				</Button>
				<Button
					variant="ghost"
					color="secondary"
					prefix={<DatabaseZap size={14} />}
					className={cx(styles.typeBtn, {
						[styles.typeBtnSelected]: value === 'QUERY',
					})}
					onClick={(): void => onChange('QUERY')}
					testId="variable-type-query"
				>
					Query
					<Badge color="amber" className={styles.betaTag}>
						Not Recommended
					</Badge>
				</Button>
			</div>
		</div>
	);
}

export default VariableTypeSelector;
