let _isNoAuthMode = false;

export const setNoAuthMode = (value: boolean): void => {
	_isNoAuthMode = value;
};

export const getIsNoAuthMode = (): boolean => _isNoAuthMode;
