package binding

import (
	"github.com/SigNoz/signoz/pkg/errors"
	ginbinding "github.com/gin-gonic/gin/binding"
)

const (
	ErrMessageInvalidQuery string = "request query contains invalid fields, please verify the format and try again."
)

var _ BindingQuery = (*queryBinding)(nil)

type queryBinding struct{}

func (b *queryBinding) BindQuery(query map[string][]string, obj any) error {
	err := ginbinding.MapFormWithTag(obj, query, "query")
	if err != nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidRequestQuery, ErrMessageInvalidQuery).WithAdditional(err.Error())
	}

	return nil
}
