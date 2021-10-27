import { Typography } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	margin-top: 2rem;
`;

export const Name = styled(Typography)`
	&&& {
		text-transform: capitalize;
		font-weight: 600;
		color: #177ddc;
		cursor: pointer;
	}
`;
