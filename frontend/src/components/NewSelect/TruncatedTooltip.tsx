import {
	cloneElement,
	FocusEvent,
	PointerEvent,
	ReactElement,
	RefObject,
	useRef,
	useState,
} from 'react';
import { Tooltip, TooltipProps } from '@signozhq/ui/tooltip';

interface TruncatedTooltipProps {
	title: string;
	side?: TooltipProps['side'];
	/** Renders the trigger; attach the ref to the element that may truncate. */
	children: (textRef: RefObject<HTMLSpanElement>) => ReactElement;
}

function TruncatedTooltip({
	title,
	side = 'right',
	children,
}: TruncatedTooltipProps): JSX.Element {
	const textRef = useRef<HTMLSpanElement>(null);
	const [truncated, setTruncated] = useState(false);

	const measure = (): void => {
		const el = textRef.current;
		setTruncated(!!el && el.scrollWidth > el.clientWidth);
	};

	const trigger = children(textRef);

	return (
		<Tooltip title={truncated ? title : undefined} side={side}>
			{cloneElement(trigger, {
				onPointerEnter: (event: PointerEvent<HTMLElement>): void => {
					measure();
					trigger.props.onPointerEnter?.(event);
				},
				onFocus: (event: FocusEvent<HTMLElement>): void => {
					measure();
					trigger.props.onFocus?.(event);
				},
			})}
		</Tooltip>
	);
}

export default TruncatedTooltip;
