package authtypes

import (
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

type GettableResources struct {
	Resources []*coretypes.GettableResource       `json:"resources" required:"true" nullable:"false"`
	Relations map[coretypes.Verb][]coretypes.Type `json:"relations" required:"true"`
}

func NewGettableResources(resources []*coretypes.GettableResource) *GettableResources {
	return &GettableResources{
		Resources: resources,
		Relations: coretypes.VerbsForTypes(),
	}
}

type Object struct {
	Resource coretypes.GettableResource `json:"resource" required:"true"`
	Selector Selector                   `json:"selector" required:"true"`
}

type GettableObjects struct {
	Resource  coretypes.GettableResource `json:"resource" required:"true"`
	Selectors []Selector                 `json:"selectors" required:"true" nullable:"false"`
}

type PatchableObjects struct {
	Additions []*GettableObjects `json:"additions" required:"true" nullable:"true"`
	Deletions []*GettableObjects `json:"deletions" required:"true" nullable:"true"`
}

func NewObject(resource coretypes.GettableResource, selector Selector) (*Object, error) {
	err := IsValidSelector(resource.Type, selector.String())
	if err != nil {
		return nil, err
	}

	return &Object{Resource: resource, Selector: selector}, nil
}

func NewObjectsFromGettableObjects(patchableObjects []*GettableObjects) ([]*Object, error) {
	objects := make([]*Object, 0)

	for _, patchObject := range patchableObjects {
		for _, selector := range patchObject.Selectors {
			object, err := NewObject(patchObject.Resource, selector)
			if err != nil {
				return nil, err
			}

			objects = append(objects, object)
		}
	}

	return objects, nil
}

func NewPatchableObjects(additions []*GettableObjects, deletions []*GettableObjects, relation coretypes.Verb) ([]*Object, []*Object, error) {
	if len(additions) == 0 && len(deletions) == 0 {
		return nil, nil, errors.New(errors.TypeInvalidInput, ErrCodeInvalidPatchObject, "empty object patch request received, at least one of additions or deletions must be present")
	}

	for _, object := range additions {
		if err := coretypes.ErrIfVerbNotValidForType(relation, object.Resource.Type); err != nil {
			return nil, nil, err
		}
	}

	for _, object := range deletions {
		if err := coretypes.ErrIfVerbNotValidForType(relation, object.Resource.Type); err != nil {
			return nil, nil, err
		}
	}

	additionObjects, err := NewObjectsFromGettableObjects(additions)
	if err != nil {
		return nil, nil, err
	}

	deletionsObjects, err := NewObjectsFromGettableObjects(deletions)
	if err != nil {
		return nil, nil, err
	}

	return additionObjects, deletionsObjects, nil
}

func NewGettableObjects(objects []*Object) []*GettableObjects {
	grouped := make(map[coretypes.GettableResource][]Selector)
	for _, obj := range objects {
		key := obj.Resource
		if _, ok := grouped[key]; !ok {
			grouped[key] = make([]Selector, 0)
		}

		grouped[key] = append(grouped[key], obj.Selector)
	}

	gettableObjects := make([]*GettableObjects, 0, len(grouped))
	for resource, selectors := range grouped {
		gettableObjects = append(gettableObjects, &GettableObjects{
			Resource:  resource,
			Selectors: selectors,
		})
	}

	return gettableObjects
}

func MustNewObject(resource coretypes.GettableResource, selector Selector) *Object {
	object, err := NewObject(resource, selector)
	if err != nil {
		panic(err)
	}

	return object
}

func MustNewObjectFromString(input string) *Object {
	parts := strings.Split(input, "/")
	if len(parts) != 4 {
		panic(errors.Newf(errors.TypeInternal, errors.CodeInternal, "invalid input format: %s", input))
	}

	typeParts := strings.Split(parts[0], ":")
	if len(typeParts) != 2 {
		panic(errors.Newf(errors.TypeInternal, errors.CodeInternal, "invalid type format: %s", parts[0]))
	}

	resource := coretypes.GettableResource{
		Type: coretypes.MustNewType(typeParts[0]),
		Kind: coretypes.MustNewKind(parts[2]),
	}

	selector := MustNewSelector(resource.Type, parts[3])

	return &Object{Resource: resource, Selector: selector}
}

func MustNewObjectsFromStringSlice(input []string) []*Object {
	objects := make([]*Object, 0, len(input))
	for _, str := range input {
		objects = append(objects, MustNewObjectFromString(str))
	}
	return objects
}

func (object *Object) UnmarshalJSON(data []byte) error {
	var shadow = struct {
		Resource coretypes.GettableResource
		Selector Selector
	}{}

	err := json.Unmarshal(data, &shadow)
	if err != nil {
		return err
	}

	obj, err := NewObject(shadow.Resource, shadow.Selector)
	if err != nil {
		return err
	}

	*object = *obj
	return nil
}
