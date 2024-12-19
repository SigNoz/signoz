import { Color } from '@signozhq/design-tokens';
import { Typography } from 'antd';
import styled from 'styled-components';

export const ListContainer = styled.div<{ $isDarkMode: boolean }>`
	position: relative;
	height: 21rem;
	overflow: hidden;

	background-color: ${({ $isDarkMode }): string =>
		$isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100};
`;

export const EmptyText = styled(Typography)`
	padding: 0 1.5rem;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
`;
