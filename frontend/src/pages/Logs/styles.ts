import { Col, Space } from 'antd';
import styled from 'styled-components';

export const StyledCol = styled(Col)`
	display: flex;
	flex-direction: column;
`;

const SpaceContainer = styled(Space)`
	.ant-space-item:nth-child(1) {
		width: 100%;
	}
`;

export default SpaceContainer;
