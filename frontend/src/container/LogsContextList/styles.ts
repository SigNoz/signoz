import { Space, Typography } from 'antd';
import styled from 'styled-components';

export const ListContainer = styled.div<{ $isDarkMode: boolean }>`
	position: relative;
	margin: 0 -1.5rem;
	height: 10rem;
	overflow-y: scroll;

	background-color: ${({ $isDarkMode }): string =>
		$isDarkMode ? '#262626' : '#ddd'};
`;

export const ShowButtonWrapper = styled(Space)`
	margin: 0.625rem 0;
`;

export const EmptyText = styled(Typography)`
	padding: 0 1.5rem;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
`;
