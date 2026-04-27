package coretypes

import (
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	ErrCodeInvalidPatchObject = errors.MustNewCode("authz_invalid_patch_objects")
)

type Object struct {
	Resource GettableResource `json:"resource" required:"true"`
	Selector Selector         `json:"selector" required:"true"`
}

type ObjectGroup struct {
	Resource  GettableResource `json:"resource" required:"true"`
	Selectors []Selector       `json:"selectors" required:"true" nullable:"false"`
}

type PatchableObjects struct {
	Additions []*ObjectGroup `json:"additions" required:"true" nullable:"true"`
	Deletions []*ObjectGroup `json:"deletions" required:"true" nullable:"true"`
}

func NewObject(resource GettableResource, inputSelector string) (*Object, error) {
	selector, err := resource.Type.Selector(inputSelector)
	if err != nil {
		return nil, err
	}

	return &Object{Resource: resource, Selector: selector}, nil
}

func MustNewObject(resource GettableResource, inputSelector string) *Object {
	object, err := NewObject(resource, inputSelector)
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

	resource := GettableResource{
		Type: MustNewType(typeParts[0]),
		Kind: MustNewKind(parts[2]),
	}

	selector := resource.Type.MustSelector(parts[3])

	return &Object{Resource: resource, Selector: selector}
}

func MustNewObjectsFromStringSlice(input []string) []*Object {
	objects := make([]*Object, 0, len(input))
	for _, str := range input {
		objects = append(objects, MustNewObjectFromString(str))
	}
	return objects
}

func NewObjectsFromObjectGroup(objectGroup ObjectGroup) ([]*Object, error) {
	objects := make([]*Object, 0)

	for _, selector := range objectGroup.Selectors {
		object, err := NewObject(objectGroup.Resource, selector.String())
		if err != nil {
			return nil, err
		}

		objects = append(objects, object)
	}

	return objects, nil
}

func NewObjectsFromObjectGroups(objectGroups []*ObjectGroup) ([]*Object, error) {
	objects := make([]*Object, 0)

	for _, objectGroup := range objectGroups {
		groupObjects, err := NewObjectsFromObjectGroup(*objectGroup)
		if err != nil {
			return nil, err
		}

		objects = append(objects, groupObjects...)
	}

	return objects, nil
}

func NewObjectGroupsFromObjects(objects []*Object) []*ObjectGroup {
	grouped := make(map[GettableResource][]Selector)
	for _, obj := range objects {
		key := obj.Resource
		if _, ok := grouped[key]; !ok {
			grouped[key] = make([]Selector, 0)
		}

		grouped[key] = append(grouped[key], obj.Selector)
	}

	objectGroups := make([]*ObjectGroup, 0, len(grouped))
	for resource, selectors := range grouped {
		objectGroups = append(objectGroups, &ObjectGroup{
			Resource:  resource,
			Selectors: selectors,
		})
	}

	return objectGroups
}

func NewPatchableObjects(additions []*ObjectGroup, deletions []*ObjectGroup, verb Verb) ([]*Object, []*Object, error) {
	if len(additions) == 0 && len(deletions) == 0 {
		return nil, nil, errors.New(errors.TypeInvalidInput, ErrCodeInvalidPatchObject, "empty object patch request received, at least one of additions or deletions must be present")
	}

	for _, objectGroup := range additions {
		if err := ErrIfVerbNotValidForType(verb, objectGroup.Resource.Type); err != nil {
			return nil, nil, err
		}
	}

	for _, objectGroup := range deletions {
		if err := ErrIfVerbNotValidForType(verb, objectGroup.Resource.Type); err != nil {
			return nil, nil, err
		}
	}

	additionObjects, err := NewObjectsFromObjectGroups(additions)
	if err != nil {
		return nil, nil, err
	}

	deletionObjects, err := NewObjectsFromObjectGroups(deletions)
	if err != nil {
		return nil, nil, err
	}

	return additionObjects, deletionObjects, nil
}

func (object *Object) UnmarshalJSON(data []byte) error {
	var shadow = struct {
		Resource GettableResource
		Selector Selector
	}{}

	err := json.Unmarshal(data, &shadow)
	if err != nil {
		return err
	}

	obj, err := NewObject(shadow.Resource, shadow.Selector.String())
	if err != nil {
		return err
	}

	*object = *obj
	return nil
}
