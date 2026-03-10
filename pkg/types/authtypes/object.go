package authtypes

import (
	"encoding/json"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

type Resource struct {
	Name Name `json:"name" required:"true"`
	Type Type `json:"type" required:"true"`
}

type GettableResources struct {
	Resources []*Resource         `json:"resources" required:"true" nullable:"false"`
	Relations map[Relation][]Type `json:"relations" required:"true"`
}

type Object struct {
	Resource Resource `json:"resource" required:"true"`
	Selector Selector `json:"selector" required:"true"`
}

type GettableObjects struct {
	Resource  Resource   `json:"resource" required:"true"`
	Selectors []Selector `json:"selectors" required:"true" nullable:"false"`
}

type PatchableObjects struct {
	Additions []*GettableObjects `json:"additions" required:"true" nullable:"true"`
	Deletions []*GettableObjects `json:"deletions" required:"true" nullable:"true"`
}

func NewObject(resource Resource, selector Selector) (*Object, error) {
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

func NewPatchableObjects(additions []*GettableObjects, deletions []*GettableObjects, relation Relation) ([]*Object, []*Object, error) {
	if len(additions) == 0 && len(deletions) == 0 {
		return nil, nil, errors.New(errors.TypeInvalidInput, ErrCodeInvalidPatchObject, "empty object patch request received, at least one of additions or deletions must be present")
	}

	for _, object := range additions {
		if !slices.Contains(TypeableRelations[object.Resource.Type], relation) {
			return nil, nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidRelation, "relation %s is invalid for type %s", relation.StringValue(), object.Resource.Type.StringValue())
		}
	}

	for _, object := range deletions {
		if !slices.Contains(TypeableRelations[object.Resource.Type], relation) {
			return nil, nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidRelation, "relation %s is invalid for type %s", relation.StringValue(), object.Resource.Type.StringValue())
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

func NewGettableResources(resources []*Resource) *GettableResources {
	return &GettableResources{
		Resources: resources,
		Relations: RelationsTypeable,
	}
}

func NewGettableObjects(objects []*Object) []*GettableObjects {
	grouped := make(map[Resource][]Selector)
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

func MustNewObject(resource Resource, selector Selector) *Object {
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

	resource := Resource{
		Type: MustNewType(typeParts[0]),
		Name: MustNewName(parts[2]),
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
		Resource Resource
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
