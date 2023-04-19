import { CloseCircleOutlined } from '@ant-design/icons';
import { Row } from 'antd';
import styled from 'styled-components';

export const StyledDeleteEntity = styled(CloseCircleOutlined)`
	position: absolute;
	top: 0.5rem;
	right: 0.9375rem;
	z-index: 1;
	cursor: pointer;
	opacity: 0.45;
	width: 1.3125rem;
	height: 1.3125rem;
	svg {
		width: 100%;
		height: 100%;
	}
`;

export const StyledRow = styled(Row)`
	padding-right: 3rem;
`;

export const StyledFilterRow = styled(Row)`
	margin-bottom: 0.875rem;
`;
