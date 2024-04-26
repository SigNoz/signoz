import { InputNumber } from 'antd';
import styled from 'styled-components';

export const MaxLinesFieldWrapper = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1.125rem;
`;

export const MaxLinesInput = styled(InputNumber)`
	max-width: 46px;
`;
