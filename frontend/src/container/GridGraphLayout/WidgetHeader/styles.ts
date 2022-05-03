import { grey } from '@ant-design/colors';
import styled from 'styled-components';

export const MenuItemContainer = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
`;

export const HeaderContainer = styled.div<{ hover: boolean }>`
	width: 100%;
	text-align: center;
	background: ${({ hover }): string => (hover ? `${grey[0]}66` : 'inherit')};
	padding: 0.25rem 0;
	font-size: 0.8rem;
	cursor: all-scroll;
	position: absolute;
`;

export const HeaderContentContainer = styled.span`
	cursor: pointer;
	position: relative;
	text-align: center;
`;

export const ArrowContainer = styled.span<{ hover: boolean }>`
	visibility: ${({ hover }): string => (hover ? 'visible' : 'hidden')};
	position: absolute;
	right: -1rem;
`;
