import { TooltipSimple, TooltipSimpleProps } from '@signozhq/ui/tooltip';
import cx from 'classnames';

import styles from './TooltipSurface.module.scss';

function TraceTooltip({
	tooltipContentProps,
	...props
}: TooltipSimpleProps): JSX.Element {
	return (
		<TooltipSimple
			{...props}
			tooltipContentProps={{
				...tooltipContentProps,
				className: cx(styles.content, tooltipContentProps?.className),
			}}
		/>
	);
}

export default TraceTooltip;
