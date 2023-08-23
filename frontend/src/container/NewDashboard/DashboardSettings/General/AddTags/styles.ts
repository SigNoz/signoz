import { Col, Input, Tag } from 'antd';
import styled from 'styled-components';

export const TagsContainer = styled.div`
	display: flex;
	align-items: center;
	gap: 0.5rem;
`;

export const StyledTag = styled(Tag)`
	&&& {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 100%;
		margin-right: 0;
		font-size: 0.8rem;
		line-height: 1.3rem;

		svg {
			margin-right: 0.2rem;
		}
	}
`;

export const NewTagContainer = styled(StyledTag)`
	border-style: dashed;
`;

export const InputContainer = styled(Col)`
	> div {
		margin: 0;
	}
`;

export const StyledInput = styled(Input)`
	margin-bottom: 0;
	font-size: 0.8rem;
	line-height: 1.3rem;
`;
