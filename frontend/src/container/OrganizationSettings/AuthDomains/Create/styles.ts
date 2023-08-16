import { Space } from 'antd';
import styled from 'styled-components';

export const RowContainer = styled.div`
	display: flex;
	flex-direction: column;
	margin-top: 1rem;
`;

export const RowSpace = styled(Space)`
	&&& {
		row-gap: 1.5rem !important;
	}
`;
