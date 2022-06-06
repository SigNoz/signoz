import { useEffect } from 'react';

// eslint-disable-next-line react-hooks/exhaustive-deps
const useMountOnce = (callback: VoidFunction): void => useEffect(callback, []);

export default useMountOnce;
