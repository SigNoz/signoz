import './Java.styles.scss';
import { MDXProvider } from '@mdx-js/react';
import { Select, Space, Steps } from 'antd';

import Post from './java.md';

export default function Java({ activeStep }): JSX.Element {
	console.log(';activeStep', activeStep);
	return (
		<>
			{activeStep === 2 && (
				<div className="java-setup-instructions-container">
					<div className="header">
						<img
							className={'supported-language-img'}
							src={`/Logos/java.png`}
							alt=""
						/>
						<div className="title">
							<h1>Java OpenTelemetry Instrumentation</h1>
							<div className="detailed-docs-link">
								View detailed docs
								<a target="_blank" href="https://signoz.io/docs/instrumentation/java/">
									here
								</a>
							</div>
						</div>
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
