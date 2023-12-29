import { Typography } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	margin-top: 2rem;
`;

export const Name = styled(Typography)`
	&&& {
		font-weight: 600;
		color: #4e74f8;
		cursor: pointer;
	}
`;
