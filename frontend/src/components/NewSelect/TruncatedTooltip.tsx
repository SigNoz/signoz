import { ReactElement, RefObject, useRef, useState } from 'react';
import { TooltipSimple, TooltipSimpleProps } from '@signozhq/ui/tooltip';

import styles from './TruncatedTooltip.module.scss';

interface TruncatedTooltipProps {
	title: string;
	side?: TooltipSimpleProps['side'];
	/** Renders the trigger; attach the ref to the element that may truncate. */
	children: (textRef: RefObject<HTMLSpanElement>) => ReactElement;
}

function TruncatedTooltip({
	title,
	side = 'right',
	children,
}: TruncatedTooltipProps): JSX.Element {
	const textRef = useRef<HTMLSpanElement>(null);
	const [open, setOpen] = useState(false);

	const handleOpenChange = (next: boolean): void => {
		const el = textRef.current;
		setOpen(next && !!el && el.scrollWidth > el.clientWidth);
	};

	return (
		<TooltipSimple
			title={title}
			side={side}
			arrow
			delayDuration={300}
			open={open}
			onOpenChange={handleOpenChange}
			tooltipContentProps={{ className: styles.tooltipContent }}
		>
			{children(textRef)}
		</TooltipSimple>
	);
}

export default TruncatedTooltip;
