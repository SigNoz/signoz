import './Java.styles.scss';

import { CodeOutlined, DownOutlined } from '@ant-design/icons';
import { MDXProvider } from '@mdx-js/react';
import TabItem from '@theme/TabItem';
import Tabs from '@theme/Tabs';
import MDEditor from '@uiw/react-md-editor';
import type { MenuProps } from 'antd';
import { Button, Divider, Dropdown, message, Select, Space, Steps } from 'antd';

import Post from './java.mdx';

export default function Java({ activeStep }): JSX.Element {
	console.log(';activeStep', activeStep);
	return (
		<>
			{' '}
			{activeStep === 2 && (
				<div className="java-setup-instructions-container">
					<div className="header">
						<h1>
							<img
								className={'supported-language-img'}
								src={`/Logos/java.png`}
								alt=""
							/>
							Java OpenTelemetry Instrumentation
						</h1>
					</div>
					<div className="framework-selector">
						<div className="label"> Select Framework </div>

						<Select
							defaultValue="tomcat"
							style={{ minWidth: 120 }}
							placeholder="Select Framework"
							options={[
								{
									value: 'tomcat',
									label: 'Tomcat',
								},
								{
									value: 'spring_boot',
									label: 'Spring Boot',
								},
								{
									value: 'jboss',
									label: 'JBoss',
								},
								{
									value: 'other',
									label: 'Others',
								},
							]}
						/>
					</div>

					<div className="content-container">
						<MDXProvider>
							<Post />
						</MDXProvider>
					</div>
				</div>
			)}
			{activeStep === 3 && (
				<div className="connection-status-container">
					<Steps
						progressDot
						current={1}
						direction="vertical"
						items={[
							{
								title: 'Finished',
								description: 'Ping Successful',
							},
							{
								title: 'Waiting',
								description: 'Receiving Data from the application',
							},
						]}
					/>
				</div>
			)}
		</>
	);
}
