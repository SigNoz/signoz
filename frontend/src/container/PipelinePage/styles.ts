import { Button } from 'antd';
import styled from 'styled-components';

export const ButtonContainer = styled.div`
	&&& {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 2rem;
		align-items: center;
	}
`;

export const AddPipelineButton = styled(Button)`
	&&& {
		margin-left: 1rem;
	}
`;

export const ModalFooterTitle = styled.span`
	font-style: normal;
	font-weight: 400;
	font-size: 0.875rem;
	line-height: 1.25rem;
`;
