import { grey } from '@ant-design/colors';
import styled from 'styled-components';

export const DashedContainer = styled.div`
	border: ${`1px dashed ${grey[0]}`};
	box-sizing: border-box;
	border-radius: 0.25rem;
	display: flex;
	justify-content: space-between;
	padding: 1rem;
	margin-top: 1.875rem;
	margin-bottom: 1.625rem;
	align-items: center;
`;

export const ButtonContainer = styled.div`
	display: flex;
	gap: 1rem;
`;

export const EventContainer = styled.div`
	display: flex;
	justify-content: space-between;
`;

export const EditorContainer = styled.div`
	margin-top: 1.5rem;
`;
