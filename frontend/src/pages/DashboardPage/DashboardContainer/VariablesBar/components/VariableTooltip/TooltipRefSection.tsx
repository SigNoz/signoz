import { ArrowDown, ArrowUp } from '@signozhq/icons';
import cx from 'classnames';

import styles from './VariableTooltip.module.scss';

interface TooltipRefSectionProps {
	label: string;
	/** Variable names, rendered as `$name` chips. */
	refs: string[];
	/** Up = this variable depends on others (parents); down = others use it (children). */
	direction: 'up' | 'down';
	colorClassName: string;
}

/** One directional dependency list in the variable tooltip (Depends on / Used by). */
function TooltipRefSection({
	label,
	refs,
	direction,
	colorClassName,
}: TooltipRefSectionProps): JSX.Element {
	const Arrow = direction === 'up' ? ArrowUp : ArrowDown;

	return (
		<div className={styles.tooltipSection}>
			<div className={cx(styles.tooltipLabel, colorClassName)}>
				<Arrow size={10} />
				{label}
			</div>
			<div className={styles.tooltipRefs}>
				{refs.map((name) => (
					<span key={name} className={cx(styles.tooltipRef, colorClassName)}>
						${name}
					</span>
				))}
			</div>
		</div>
	);
}

export default TooltipRefSection;
