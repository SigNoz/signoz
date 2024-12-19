import './Tags.styles.scss';

import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Tag } from 'antd/lib';
import Input from 'components/Input';
import { Check, X } from 'lucide-react';
import React, { Dispatch, SetStateAction, useState } from 'react';

function Tags({ tags, setTags }: AddTagsProps): JSX.Element {
	const [inputValue, setInputValue] = useState<string>('');
	const [inputVisible, setInputVisible] = useState<boolean>(false);

	const handleInputConfirm = (): void => {
		if (tags.indexOf(inputValue) > -1) {
			return;
		}

		if (inputValue) {
			setTags([...tags, inputValue]);
		}
		setInputVisible(false);
		setInputValue('');
	};

	const handleClose = (removedTag: string): void => {
		const newTags = tags.filter((tag) => tag !== removedTag);
		setTags(newTags);
	};

	const showInput = (): void => {
		setInputVisible(true);
		setInputValue('');
	};

	const hideInput = (): void => {
		setInputValue('');
		setInputVisible(false);
	};

	const onChangeHandler = (
		value: string,
		func: Dispatch<SetStateAction<string>>,
	): void => {
		func(value);
	};

	return (
		<div className="tags-container">
			{tags.map<React.ReactNode>((tag) => (
				<Tag
					key={tag}
					closable
					style={{ userSelect: 'none' }}
					onClose={(): void => handleClose(tag)}
				>
					<span>{tag}</span>
				</Tag>
			))}

			{inputVisible && (
				<div className="add-tag-container">
					<Input
						type="text"
						autoFocus
						value={inputValue}
						onChangeHandler={(event): void =>
							onChangeHandler(event.target.value, setInputValue)
						}
						onPressEnterHandler={handleInputConfirm}
					/>

					<div className="confirm-cancel-actions">
						<Button
							type="primary"
							className="periscope-btn"
							size="small"
							icon={<Check size={14} />}
							onClick={handleInputConfirm}
						/>

						<Button
							type="primary"
							className="periscope-btn"
							size="small"
							icon={<X size={14} />}
							onClick={hideInput}
						/>
					</div>
				</div>
			)}

			{!inputVisible && (
				<Button
					type="primary"
					size="small"
					style={{
						fontSize: '11px',
					}}
					icon={<PlusOutlined />}
					onClick={showInput}
				>
					New Tag
				</Button>
			)}
		</div>
	);
}

interface AddTagsProps {
	tags: string[];
	setTags: Dispatch<SetStateAction<string[]>>;
}

export default Tags;
