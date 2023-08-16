import { Col, Tag as AntDTag } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	min-height: 78vh;
	display: flex;
	margin-top: 1rem;
	flex-direction: column;
`;

export const RightContainerWrapper = styled(Col)`
	&&& {
		min-width: 200px;
		margin-bottom: 1rem;
	}
`;

export const LeftContainerWrapper = styled(Col)`
	&&& {
		margin-right: 1rem;
		margin-bottom: 1rem;
		max-width: 70%;
	}
`;

export const ButtonContainer = styled.div`
	display: flex;
	gap: 1rem;
	margin-bottom: 1rem;
	justify-content: flex-end;
`;

export const PanelContainer = styled.div`
	display: flex;
`;

export const Tag = styled(AntDTag)`
	margin: 0;
`;
