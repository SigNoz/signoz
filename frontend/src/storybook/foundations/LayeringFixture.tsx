import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Button } from 'antd';
import { useState } from 'react';

import { CustomSelect } from '@/components/NewSelect';
import SignozModal from '@/components/SignozModal/SignozModal';

import styles from './LayeringFixture.module.scss';

export type LayeringHost = 'modal' | 'drawer' | 'scrollable-panel';

interface LayeringFixtureProps {
	host: LayeringHost;
}

const environmentOptions = [
	{ label: 'Development', value: 'development' },
	{ label: 'Staging', value: 'staging' },
	{ label: 'Production', value: 'production' },
];

function LayeringFixture({ host }: LayeringFixtureProps): JSX.Element {
	const [isHostOpen, setIsHostOpen] = useState(false);
	const [environment, setEnvironment] = useState('production');

	if (host === 'modal') {
		return (
			<div className={styles.fixture}>
				<Button
					data-testid="open-layering-modal"
					type="primary"
					onClick={(): void => setIsHostOpen(true)}
				>
					Open modal
				</Button>
				<SignozModal
					footer={null}
					open={isHostOpen}
					title="Layering modal"
					onCancel={(): void => setIsHostOpen(false)}
				>
					<div className={styles.overlayContent}>
						<CustomSelect
							aria-label="Modal environment"
							getPopupContainer={(): HTMLElement => document.body}
							options={environmentOptions}
							value={environment}
							onChange={(value): void => setEnvironment(String(value))}
						/>
					</div>
				</SignozModal>
			</div>
		);
	}

	if (host === 'drawer') {
		return (
			<div className={styles.fixture}>
				<Button
					data-testid="open-layering-drawer"
					type="primary"
					onClick={(): void => setIsHostOpen(true)}
				>
					Open drawer
				</Button>
				<DrawerWrapper
					direction="right"
					open={isHostOpen}
					title="Layering drawer"
					onOpenChange={setIsHostOpen}
				>
					<div
						className={styles.overlayContent}
						data-testid="layering-drawer-content"
					>
						<CustomSelect
							aria-label="Drawer environment"
							getPopupContainer={(trigger): HTMLElement =>
								trigger.closest(
									'[data-testid="layering-drawer-content"]',
								) as HTMLElement
							}
							options={environmentOptions}
							value={environment}
							onChange={(value): void => setEnvironment(String(value))}
						/>
					</div>
				</DrawerWrapper>
			</div>
		);
	}

	return (
		<div className={styles.fixture}>
			<div className={styles.scrollPanel} data-testid="layering-scroll-panel">
				<p>Scrollable panel</p>
				<div className={styles.scrollSpacer} />
				<CustomSelect
					aria-label="Scrollable panel environment"
					getPopupContainer={(trigger): HTMLElement =>
						trigger.closest('[data-testid="layering-scroll-panel"]') as HTMLElement
					}
					options={environmentOptions}
					value={environment}
					onChange={(value): void => setEnvironment(String(value))}
				/>
			</div>
		</div>
	);
}

export default LayeringFixture;
