import type { Decorator } from '@storybook/react-vite';
import AppLayout from 'container/AppLayout';

/** Opt in per story with `decorators: [withAppLayout]`. */
export const withAppLayout: Decorator = (Story) => (
	<AppLayout>
		<Story />
	</AppLayout>
);
