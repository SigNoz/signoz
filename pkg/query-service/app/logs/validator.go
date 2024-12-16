package logs

import (
	"fmt"
	"regexp"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func ValidateUpdateFieldPayload(field *model.UpdateField) error {
	if field.Name == "" {
		return fmt.Errorf("name cannot be empty")
	}
	if field.Type == "" {
		return fmt.Errorf("type cannot be empty")
	}
	if field.DataType == "" {
		return fmt.Errorf("dataType cannot be empty")
	}

	matched, err := regexp.MatchString(fmt.Sprintf("^(%s|%s|%s)$", constants.Static, constants.Attributes, constants.Resources), field.Type)
	if err != nil {
		return err
	}
	if !matched {
		return fmt.Errorf("type %s not supported", field.Type)
	}

	if field.IndexType != "" {
		matched, err := regexp.MatchString(`^(minmax|set\([0-9]\)|bloom_filter\((0?.?[0-9]+|1)\)|tokenbf_v1\([0-9]+,[0-9]+,[0-9]+\)|ngrambf_v1\([0-9]+,[0-9]+,[0-9]+,[0-9]+\))$`, field.IndexType)
		if err != nil {
			return err
		}
		if !matched {
			return fmt.Errorf("index type %s not supported", field.IndexType)
		}
	}
	return nil
}

func ValidateUpdateFieldPayloadV2(field *model.UpdateField) error {
	if field.Name == "" {
		return fmt.Errorf("name cannot be empty")
	}
	if field.Type == "" {
		return fmt.Errorf("type cannot be empty")
	}
	if field.DataType == "" {
		return fmt.Errorf("dataType cannot be empty")
	}

	// the logs api uses the old names i.e attributes and resources while traces use tag and attribute.
	// update log api to use tag and attribute.
	matched, err := regexp.MatchString(fmt.Sprintf("^(%s|%s)$", v3.AttributeKeyTypeTag, v3.AttributeKeyTypeResource), field.Type)
	if err != nil {
		return err
	}
	if !matched {
		return fmt.Errorf("type %s not supported", field.Type)
	}

	if field.IndexType != "" {
		matched, err := regexp.MatchString(`^(minmax|set\([0-9]\)|bloom_filter\((0?.?[0-9]+|1)\)|tokenbf_v1\([0-9]+,[0-9]+,[0-9]+\)|ngrambf_v1\([0-9]+,[0-9]+,[0-9]+,[0-9]+\))$`, field.IndexType)
		if err != nil {
			return err
		}
		if !matched {
			return fmt.Errorf("index type %s not supported", field.IndexType)
		}
	}
	return nil
}
