import styled from 'styled-components';

export const HeaderContainer = styled.div<{ hover: boolean }>`
	width: 100%;
	text-align: center;
	padding: 0.25rem 0;
	font-size: 0.8rem;
	position: absolute;
	top: 0;
	left: 0;
`;

export const HeaderContentContainer = styled.span`
	cursor: pointer;
	position: relative;
	text-align: center;
`;

export const ThesholdContainer = styled.span`
	margin-top: -0.3rem;
`;

export const DisplayThresholdContainer = styled.div`
	display: flex;
	align-items: center;
	width: auto;
	justify-content: space-between;
`;

export const WidgetHeaderContainer = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	align-items: center;
	height: 30px;
	width: 100%;
	left: 0;
`;

export const ArrowContainer = styled.span<{ hover: boolean }>`
	visibility: ${({ hover }: { hover: boolean }): string => (hover ? 'visible' : 'hidden')};
`;
