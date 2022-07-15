import { blue } from '@ant-design/colors';
import styled from 'styled-components';

export const QueryFieldContainer = styled.div`
	padding: 0.25rem 0.5rem;
	margin: 0.1rem 0.5rem 0;
	display: flex;
	flex-direction: row;
	border-radius: 0.25rem;

	&:hover {
		background: ${blue[5]};
	}
`;
