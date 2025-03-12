package factory

import "fmt"

// Named is implemented by all types of factories.
type Named interface {
	Name() Name
}

type NamedMap[T Named] struct {
	factories        map[Name]T
	factoriesInOrder []T
}

// NewNamedMap creates a new NamedMap from a list of factories.
// It returns an error if the factories have duplicate names.
func NewNamedMap[T Named](factories ...T) (NamedMap[T], error) {
	fmap := make(map[Name]T)
	for _, factory := range factories {
		if _, ok := fmap[factory.Name()]; ok {
			return NamedMap[T]{}, fmt.Errorf("cannot build factory map, duplicate name %q found", factory.Name())
		}

		fmap[factory.Name()] = factory
	}

	return NamedMap[T]{factories: fmap, factoriesInOrder: factories}, nil
}

// MustNewNamedMap creates a new NamedMap from a list of factories.
// It panics if the factories have duplicate names.
func MustNewNamedMap[T Named](factories ...T) NamedMap[T] {
	nm, err := NewNamedMap(factories...)
	if err != nil {
		panic(err)
	}
	return nm
}

// Get returns the factory for the given name by string.
// It returns an error if the factory is not found or the name is invalid.
func (n *NamedMap[T]) Get(namestr string) (t T, err error) {
	name, err := NewName(namestr)
	if err != nil {
		return
	}

	factory, ok := n.factories[name]
	if !ok {
		err = fmt.Errorf("factory %q not found or not registered", name)
		return
	}

	t = factory
	return
}

// Add adds a factory to the NamedMap.
// It returns an error if the factory already exists.
func (n *NamedMap[T]) Add(factory T) (err error) {
	name := factory.Name()
	if _, ok := n.factories[name]; ok {
		return fmt.Errorf("factory %q already exists", name)
	}

	n.factories[name] = factory
	n.factoriesInOrder = append(n.factoriesInOrder, factory)
	return nil
}

// GetInOrder returns the factories in the order they were added.
func (n *NamedMap[T]) GetInOrder() []T {
	return n.factoriesInOrder
}
