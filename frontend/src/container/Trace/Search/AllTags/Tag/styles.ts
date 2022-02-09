import styled from 'styled-components';
import { Button, Select, Space } from 'antd';

export const SpaceComponent = styled(Space)`
	&&& {
		width: 100%;
	}
`;

export const SelectComponent = styled(Select)`
	&&& {
		min-width: 170px;
		margin-right: 21.91px;
		margin-left: 21.92px;
	}
`;

export const ValueSelect = styled(Select)`
	&&& {
		width: 100%;
	}
`;

export const Container = styled.div`
	&&& {
		display: flex;
		margin-top: 1rem;
		margin-bottom: 1rem;
	}
`;

export const IconContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	cursor: pointer;

	margin-left: 1.125rem;
`;
