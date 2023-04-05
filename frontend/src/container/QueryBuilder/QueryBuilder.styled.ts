import { CloseCircleOutlined } from '@ant-design/icons';
import { Col } from 'antd';
import styled from 'styled-components';

export const StyledDeleteEntity = styled(CloseCircleOutlined)`
	position: absolute;
	top: 0.9375rem;
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

export const StyledCol = styled(Col)`
	position: relative;
	padding-right: 3rem;
`;
