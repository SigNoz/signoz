import { CaretDownFilled, CaretRightFilled } from '@ant-design/icons';
import { Col, Typography } from 'antd';
import { StyledCol, StyledRow } from 'components/Styled';
import { IIntervalUnit } from 'container/TraceDetail/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { SPAN_DETAILS_LEFT_COL_WIDTH } from 'pages/TraceDetail/constants';
import {
	Dispatch,
	MouseEventHandler,
	SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { ITraceTree } from 'types/api/trace/getTraceItem';

import { ITraceMetaData } from '..';
import Span from '../Span';
import SpanName from '../SpanName';
import { getMetaDataFromSpanTree, getTopLeftFromBody } from '../utils';
import {
	CardComponent,
	CardContainer,
	CaretContainer,
	HoverCard,
	styles,
	Wrapper,
} from './styles';
import { getIconStyles } from './utils';

function Trace(props: TraceProps): JSX.Element {
	const {
		name,
		activeHoverId,
		setActiveHoverId,
		globalSpread,
		globalStart,
		serviceName,
		startTime,
		value,
		serviceColour,
		id,
		setActiveSelectedId,
		activeSelectedId,
		level,
		activeSpanPath,
		isExpandAll,
		intervalUnit,
		children,
		isMissing,
	} = props;

	const isDarkMode = useIsDarkMode();

	const [isOpen, setOpen] = useState<boolean>(activeSpanPath[level] === id);

	const localTreeExpandInteraction = useRef<boolean | 0>(0); // Boolean is for the state of the expansion whereas the number i.e. 0 is for skipping the user interaction.

	useEffect(() => {
		if (localTreeExpandInteraction.current !== 0) {
			setOpen(localTreeExpandInteraction.current);
			localTreeExpandInteraction.current = 0;
		} else if (!isOpen) {
			setOpen(activeSpanPath[level] === id);
		}
	}, [activeSpanPath, isOpen, id, level]);

	useEffect(() => {
		if (isExpandAll) {
			setOpen(isExpandAll);
		} else {
			setOpen(activeSpanPath[level] === id);
		}
	}, [isExpandAll, activeSpanPath, id, level]);

	const isOnlyChild = children.length === 1;
	const [top, setTop] = useState<number>(0);

	const ref = useRef<HTMLUListElement>(null);

	useEffect(() => {
		if (activeSelectedId === id) {
			ref.current?.scrollIntoView({
				block: 'nearest',
				behavior: 'auto',
				inline: 'nearest',
			});
		}
	}, [activeSelectedId, id]);

	const onMouseEnterHandler = (): void => {
		setActiveHoverId(id);
		if (ref.current) {
			const { top } = getTopLeftFromBody(ref.current);
			setTop(top);
		}
	};

	const onMouseLeaveHandler = (): void => {
		setActiveHoverId('');
	};

	const onClick = (): void => {
		setActiveSelectedId(id);
	};

	const onClickTreeExpansion: MouseEventHandler<HTMLDivElement> = (
		event,
	): void => {
		event.stopPropagation();
		setOpen((state) => {
			localTreeExpandInteraction.current = !isOpen;
			return !state;
		});
	};
	const { totalSpans } = getMetaDataFromSpanTree(props);

	const inMsCount = value;
	const nodeLeftOffset = ((startTime - globalStart) * 1e2) / globalSpread;
	const width = (value * 1e2) / (globalSpread * 1e6);
	const panelWidth = SPAN_DETAILS_LEFT_COL_WIDTH - level * (16 + 1) - 48;

	const iconStyles = useMemo(() => getIconStyles(isDarkMode), [isDarkMode]);

	const icon = useMemo(
		() =>
			isOpen ? (
				<CaretDownFilled style={iconStyles} />
			) : (
				<CaretRightFilled style={iconStyles} />
			),
		[isOpen, iconStyles],
	);

	return (
		<Wrapper
			onMouseEnter={onMouseEnterHandler}
			onMouseLeave={onMouseLeaveHandler}
			isOnlyChild={isOnlyChild}
			ref={ref}
			isDarkMode={isDarkMode}
		>
			<HoverCard
				top={top}
				isHovered={activeHoverId === id}
				isSelected={activeSelectedId === id}
				isDarkMode={isDarkMode}
			/>

			<CardContainer isMissing={isMissing} onClick={onClick}>
				<StyledCol flex={`${panelWidth}px`} styledclass={[styles.overFlowHidden]}>
					<StyledRow styledclass={[styles.flexNoWrap]}>
						<Col>
							{totalSpans !== 1 && (
								<CardComponent
									isOnlyChild={isOnlyChild}
									isDarkMode={isDarkMode}
									onClick={onClickTreeExpansion}
								>
									<Typography style={{ wordBreak: 'normal' }}>{totalSpans}</Typography>
									<CaretContainer>{icon}</CaretContainer>
								</CardComponent>
							)}
						</Col>
						<Col>
							<SpanName name={name} serviceName={serviceName} />
						</Col>
					</StyledRow>
				</StyledCol>
				<Col flex="1">
					<Span
						globalStart={globalStart}
						startTime={startTime}
						name={name}
						leftOffset={nodeLeftOffset.toString()}
						width={width.toString()}
						bgColor={serviceColour}
						inMsCount={inMsCount / 1e6}
					/>
				</Col>
			</CardContainer>

			{isOpen && (
				<>
					{children.map((child) => (
						<Trace
							key={child.id}
							activeHoverId={activeHoverId}
							setActiveHoverId={setActiveHoverId}
							// eslint-disable-next-line react/jsx-props-no-spreading
							{...child}
							globalSpread={globalSpread}
							globalStart={globalStart}
							setActiveSelectedId={setActiveSelectedId}
							activeSelectedId={activeSelectedId}
							level={level + 1}
							activeSpanPath={activeSpanPath}
							isExpandAll={isExpandAll}
							intervalUnit={intervalUnit}
							isMissing={child.isMissing}
						/>
					))}
				</>
			)}
		</Wrapper>
	);
}

Trace.defaultProps = {
	isMissing: false,
};

interface ITraceGlobal {
	globalSpread: ITraceMetaData['spread'];
	globalStart: ITraceMetaData['globalStart'];
}

interface TraceProps extends ITraceTree, ITraceGlobal {
	activeHoverId: string;
	setActiveHoverId: Dispatch<SetStateAction<string>>;
	setActiveSelectedId: Dispatch<SetStateAction<string>>;
	activeSelectedId: string;
	level: number;
	activeSpanPath: string[];
	isExpandAll: boolean;
	intervalUnit: IIntervalUnit;
	isMissing?: boolean;
}

export default Trace;
