import { Typography } from 'antd';
import styled from 'styled-components';

export const TitleContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
`;

export const IconContainer = styled.div`
	min-width: 70px;
`;

export const TitleText = styled(Typography)`
	font-weight: bold;
`;
