package logparsingpipeline

import "github.com/SigNoz/signoz/pkg/errors"

var (
	CodeInvalidOperatorType       = errors.MustNewCode("operator_type_mismatch")
	CodeFieldNilCheckType         = errors.MustNewCode("operator_field_nil_check")
	CodePipelinesGetFailed        = errors.MustNewCode("pipelines_get_failed")
	CodeProcessorFactoryMapFailed = errors.MustNewCode("processor_factory_map_failed")
)
