import { Button } from 'antd';
import styled from 'styled-components';

export const QueryButton = styled(Button)`
	&&& {
		display: flex;
		align-items: center;
	}
`;

export const QueryWrapper = styled.div`
	width: 100%;
	margin: 0;
	padding: 0.5rem 0;
	display: flex;
	flex-direction: column;
`;
