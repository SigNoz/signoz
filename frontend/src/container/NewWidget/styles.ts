import { Tag as AntDTag } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	min-height: 78vh;
	display: flex;
	flex-direction: column;
	overflow-y: hidden;
`;

export const ButtonContainer = styled.div`
	display: flex;
	gap: 8px;
	margin-bottom: 1rem;
	justify-content: flex-end;
`;

export const PanelContainer = styled.div`
	display: flex;
	overflow-y: auto;
`;

export const Tag = styled(AntDTag)`
	margin: 0;
`;
