package model

type ErrUnsupportedAuth struct{}

func (errUnsupportedAuth ErrUnsupportedAuth) Error() string {
	return "this authentication method not supported"
}
