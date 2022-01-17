import React, { useRef, useState } from 'react';
import { Space, Input, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Container } from './styles';
import useClickOutside from 'hooks/useClickOutside';
import Tags from './AllTags';

const Search = (): JSX.Element => {
	const [value, setValue] = useState<string>();
	const [isTagsModalVisible, setIsTagsModalVisible] = useState<boolean>(true);

	const tagRef = useRef(null);

	useClickOutside(tagRef, () => {
		// setIsTagsModalHandler(false);
	});

	const onChangeHandler = (search: string) => {
		setValue(search);
	};

	const setIsTagsModalHandler = (value: boolean) => {
		setIsTagsModalVisible(value);
	};

	const onFocusHandler: React.FocusEventHandler<HTMLInputElement> = (e) => {
		e.preventDefault();
		setIsTagsModalHandler(true);
	};

	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<Container ref={tagRef}>
				<Input
					onChange={(event) => onChangeHandler(event.target.value)}
					value={value}
					onFocus={onFocusHandler}
					placeholder=""
				/>

				<Button type="primary">
					<SearchOutlined />
				</Button>

				{isTagsModalVisible && <Tags />}
			</Container>
		</Space>
	);
};

export default Search;
