package spanattributemappingtypes

import "github.com/SigNoz/signoz/pkg/errors"

var (
	ErrCodeSpanAttributeMappingGroupNotFound      = errors.MustNewCode("span_attribute_mapping_group_not_found")
	ErrCodeSpanAttributeMappingGroupAlreadyExists = errors.MustNewCode("span_attribute_mapping_group_already_exists")
	ErrCodeSpanAttributeMapperNotFound            = errors.MustNewCode("span_attribute_mapper_not_found")
	ErrCodeSpanAttributeMapperAlreadyExists       = errors.MustNewCode("span_attribute_mapper_already_exists")
	ErrCodeSpanAttributeMappingInvalidInput       = errors.MustNewCode("span_attribute_mapping_invalid_input")
)
