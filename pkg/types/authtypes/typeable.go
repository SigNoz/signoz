package authtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	ErrCodeAuthZUnavailable = errors.MustNewCode("authz_unavailable")
	ErrCodeAuthZForbidden   = errors.MustNewCode("authz_forbidden")
	ErrCodeAuthZInvalidType = errors.MustNewCode("authz_invalid_type")
	ErrCodeTypeableNotFound = errors.MustNewCode("typeable_not_found")
)
