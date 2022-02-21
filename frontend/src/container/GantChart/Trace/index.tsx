import React, { useEffect, useRef, useState } from 'react';

import {
	CardComponent,
	CardContainer,
	CaretContainer,
	Wrapper,
	HoverCard,
} from './styles';
import { CaretDownFilled, CaretUpFilled } from '@ant-design/icons';
import SpanLength from '../SpanLength';
import SpanName from '../SpanName';
import { pushDStree } from 'store/actions';
import { getMetaDataFromSpanTree } from '../utils';

function getCoords(elem: HTMLElement) {
	// crossbrowser version
	let box = elem.getBoundingClientRect();

	let body = document.body;
	let docEl = document.documentElement;

	let scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
	let scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

	let clientTop = docEl.clientTop || body.clientTop || 0;
	let clientLeft = docEl.clientLeft || body.clientLeft || 0;

	let top = box.top + scrollTop - clientTop;
	let left = box.left + scrollLeft - clientLeft;

	return { top: Math.round(top), left: Math.round(left) };
}

const Trace = (props: TraceProps): JSX.Element => {
	const [isOpen, setOpen] = useState<boolean>(false);
	const containerRef = useRef<HTMLUListElement>(null);
	const { name, children, activeHoverId, setActiveHoverId } = props;
	const isOnlyChild = props.children.length === 1;
	const [top, setTop] = useState<number>(0);

	useEffect(() => {
		if (containerRef.current) {
			setTop(getCoords(containerRef.current).top);
		}
	}, []);

	const onMouseEnterHandler = () => {
		setActiveHoverId(props.id);
	};

	const onMouseLeaveHandler = () => {
		setActiveHoverId('');
	};

	useEffect(() => {
		const ref = containerRef.current;

		ref?.addEventListener('mouseenter', onMouseEnterHandler);
		ref?.addEventListener('mouseleave', onMouseLeaveHandler);

		return () => {
			ref?.removeEventListener('mouseenter', onMouseEnterHandler);
			ref?.removeEventListener('mouseleave', onMouseLeaveHandler);
		};
	}, []);

	const { totalSpans, spread, globalStart } = getMetaDataFromSpanTree(props);

	const width = props.time / spread;

	// const width = (props.value * 1e8) / spread;
	const leftOffset = ((props.startTime * 1e6 - globalStart) * 1e8) / spread;

	return (
		<Wrapper ref={containerRef} isOnlyChild={isOnlyChild}>
			{/* <HoverCard top={top} isHovered={activeHoverId === props.id} /> */}
			<CardContainer>
				{totalSpans !== 1 && (
					<CardComponent
						onClick={() => {
							setOpen((state) => !state);
						}}
					>
						{totalSpans}
						<CaretContainer>
							{!isOpen ? <CaretDownFilled /> : <CaretUpFilled />}
						</CaretContainer>
					</CardComponent>
				)}

				<SpanName name={name} serviceName={'service'} />
				<SpanLength
					leftOffset={leftOffset.toString()}
					percentage={width.toString()}
				/>
			</CardContainer>

			{isOpen && (
				<>
					{props.children.map((child) => (
						<Trace
							key={child.id}
							activeHoverId={props.activeHoverId}
							setActiveHoverId={props.setActiveHoverId}
							{...child}
						/>
					))}
				</>
			)}
		</Wrapper>
	);
};

interface TraceProps extends pushDStree {
	activeHoverId: string;
	setActiveHoverId: React.Dispatch<React.SetStateAction<string>>;
}

export default Trace;
