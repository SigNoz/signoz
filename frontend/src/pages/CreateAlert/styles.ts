import { Typography } from 'antd';
import styled from 'styled-components';

export const Title = styled(Typography)`
	&&& {
		margin-top: 1rem;
		margin-bottom: 1rem;
	}
`;

export const ButtonContainer = styled.div`
	&&& {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		margin-top: 1rem;
	}
`;
