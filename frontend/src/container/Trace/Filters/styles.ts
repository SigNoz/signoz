import { Input } from 'antd';
import styled from 'styled-components';

export const DurationContainer = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
`;

export const InputComponent = styled(Input)`
	&&& {
		margin-left: 0.5rem;
		margin-right: 0.5rem;
	}
`;

export const CheckBoxContainer = styled.div`
	display: flex;
	flex-direction: column;
`;
