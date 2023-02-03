import {
	Avatar,
	Button,
	Divider,
	Form,
	Input,
	Modal,
	Select as DefaultSelect,
	Typography,
} from 'antd';
import React from 'react';

import { modalIcon, modalIconStyle } from '../config';
import { wrapperStyle } from './config';
import { grokProcessorInputFild, items } from './utils';

function NewProcessor({
	newAddProcessor,
	setNewAddProcessor,
}: {
	newAddProcessor: boolean;
	setNewAddProcessor: (b: boolean) => void;
}): JSX.Element {
	const { Option } = DefaultSelect;
	const [form] = Form.useForm();

	return (
		<Modal
			title={<Typography.Title level={4}>Create Grok Processor</Typography.Title>}
			centered
			open={newAddProcessor}
			onOk={(): void => setNewAddProcessor(false)}
			onCancel={(): void => setNewAddProcessor(false)}
			width={800}
			footer={[
				<Button key="back" onClick={(): void => setNewAddProcessor(false)}>
					Cancel
				</Button>,
				<Button
					key="submit"
					type="primary"
					onClick={(): void => setNewAddProcessor(false)}
				>
					Create
				</Button>,
			]}
		>
			<Divider plain />
			<div style={{ marginTop: '20px' }}>
				<div style={{ display: 'flex', gap: '20px' }}>
					<Avatar size="small" style={modalIcon}>
						1
					</Avatar>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '10px',
							marginTop: '10px',
						}}
					>
						<span>Select Processor Type </span>
						<DefaultSelect
							labelInValue
							style={{ width: 200 }}
							defaultValue={{ value: 'Grok Processor', label: 'Grok Processor' }}
						>
							{items.map(({ value, label }) => (
								<Option key={value + label} value={value}>
									{label}
								</Option>
							))}
						</DefaultSelect>
					</div>
				</div>
				<Form form={form} layout="vertical" style={{ marginTop: '20px' }}>
					{grokProcessorInputFild.map((i, index) => {
						if (i.id === 1) {
							return (
								<div key={i.id + Math.random()} style={wrapperStyle}>
									<Avatar size="small" style={modalIconStyle}>
										{index + 2}
									</Avatar>
									<div style={{ width: '100%' }}>
										<Form.Item label={i.fildName} key={i.id}>
											<Input placeholder={i.placeholder} />
										</Form.Item>
									</div>
								</div>
							);
						}
						return (
							<div key={i.id + Math.random()} style={wrapperStyle}>
								<Avatar size="small" style={modalIconStyle}>
									{index + 2}
								</Avatar>
								<div style={{ width: '100%' }}>
									<Form.Item label={i.fildName}>
										<Input.TextArea rows={4} placeholder={i.placeholder} maxLength={6} />
									</Form.Item>
								</div>
							</div>
						);
					})}
				</Form>
			</div>
			<Divider plain />
		</Modal>
	);
}

export default NewProcessor;
