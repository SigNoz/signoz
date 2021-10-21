import { Card, Typography } from 'antd';
import styled from 'styled-components';

interface Props {
	isDarkMode: boolean;
}

export const Container = styled(Card)<Props>`
	border-radius: 4px;
	background: ${({ isDarkMode }): string => (isDarkMode ? '#313131' : '#ddd')};

	width: 80%;
`;

export const Heading = styled(Typography)`
	&&& {
		font-size: 2rem;
		margin-bottom: 1rem;
	}
`;
