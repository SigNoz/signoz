import { Toaster } from '@signozhq/ui/toast';

const PAGE_INSET = { bottom: 'var(--bottom-strip-height, 0px)' };

function AppToaster(): JSX.Element {
	return <Toaster position="top-right" pageInset={PAGE_INSET} />;
}

export default AppToaster;
