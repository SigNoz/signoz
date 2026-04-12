package aio11ymappingtypes

import "github.com/SigNoz/signoz/pkg/errors"

var (
	ErrCodeMappingGroupNotFound      = errors.MustNewCode("mapping_group_not_found")
	ErrCodeMappingGroupAlreadyExists = errors.MustNewCode("mapping_group_already_exists")
	ErrCodeMapperNotFound            = errors.MustNewCode("mapper_not_found")
	ErrCodeMapperAlreadyExists       = errors.MustNewCode("mapper_already_exists")
	ErrCodeMappingInvalidInput       = errors.MustNewCode("mapping_invalid_input")
)
