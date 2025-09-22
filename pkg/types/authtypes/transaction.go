package authtypes

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

type Resource struct {
	Name Name
	Type Type
}

type Object struct {
	Resource Resource
	Selector Selector
}

type Transaction struct {
	Relation Relation
	Object   Object
}

func MustNewObjectFromString(input string) *Object {
	parts := strings.Split(input, ":")
	if len(parts) != 3 {
		panic(errors.Newf(errors.TypeInternal, errors.CodeInternal, "invalid list objects output: %s", input))
	}

	resource := Resource{
		Type: MustNewType(parts[0]),
		Name: MustNewName(parts[1]),
	}

	object := &Object{
		Resource: resource,
		Selector: MustNewSelector(resource.Type, parts[2]),
	}

	return object
}

func MustNewObjectsFromStringSlice(input []string) []*Object {
	objects := make([]*Object, 0, len(input))
	for _, str := range input {
		objects = append(objects, MustNewObjectFromString(str))
	}
	return objects
}
