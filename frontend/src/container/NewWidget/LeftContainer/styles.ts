import { Card } from 'antd';
import styled from 'styled-components';

export const QueryContainer = styled(Card)`
	&&& {
		margin-top: 1rem;
		min-height: 23.5%;
	}
`;

export const NotFoundContainer = styled.div`
	min-height: 55vh;
	display: flex;
	justify-content: center;
	align-items: center;
`;
