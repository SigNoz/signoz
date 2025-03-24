import { Row } from 'antd';
import styled from 'styled-components';

export const VariableItemRow = styled(Row)`
	gap: 1rem;
	margin-bottom: 1rem;
`;

interface LabelContainerProps {
	style?: React.CSSProperties;
	children?: React.ReactNode;
}

export const LabelContainer = styled.div<LabelContainerProps>`
	width: 200px;
`;
