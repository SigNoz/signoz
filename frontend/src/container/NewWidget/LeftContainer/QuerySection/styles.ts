import { Button } from 'antd';
import styled from 'styled-components';

export const InputContainer = styled.div`
	width: 50%;
`;

export const Container = styled.div`
	margin-top: 1rem;
`;

export const QueryButton = styled(Button)`
	&&& {
		display: flex;
		align-items: center;
	}
`;
