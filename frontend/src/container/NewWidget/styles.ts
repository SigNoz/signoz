import { Col } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	min-height: 78vh;
	display: flex;
	margin-top: 1rem;
`;

export const RightContainerWrapper = styled(Col)`
	&&& {
		min-width: 280px;
	}
`;

export const LeftContainerWrapper = styled(Col)`
	&&& {
		margin-right: 1rem;
	}
`;
