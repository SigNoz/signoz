import { Col, Tag } from 'antd';
import styled from 'styled-components';

export const TagsContainer = styled.div`
	display: flex;
	align-items: center;
`;

export const NewTagContainer = styled(Tag)`
	&&& {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 100%;

		svg {
			margin-right: 0.2rem;
		}
	}
`;

export const InputContainer = styled(Col)`
	> div {
		margin: 0;
	}
`;
