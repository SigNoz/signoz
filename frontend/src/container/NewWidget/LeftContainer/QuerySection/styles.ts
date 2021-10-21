import { Button } from 'antd';
import styled from 'styled-components';

export const InputContainer = styled.div`
	width: 50%;
`;

export const Container = styled.div`
	margin-top: 1rem;
	display: flex;
`;

export const QueryButton = styled(Button)`
	&&& {
		display: flex;
		align-items: center;
	}
`;

export const QueryWrapper = styled.div`
	width: 100%; // parent need to 100%

	> div {
		width: 95%; // each child is taking 95% of the parent
	}
`;
