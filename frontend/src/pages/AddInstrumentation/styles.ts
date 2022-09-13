import { Card, Row, Typography } from 'antd';
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

export const DocCardContainer = styled(Row)<{
	isDarkMode: boolean;
}>`
	display: flex;
	border: 1px solid ${({ isDarkMode }): string => (isDarkMode ? '#444' : '#ccc')};
	border-radius: 0.2rem;
	align-items: center;
	padding: 0.5rem 0.25rem;
`;
