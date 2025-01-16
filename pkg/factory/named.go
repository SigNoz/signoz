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

func MustNewNamedMap[T Named](factories ...T) NamedMap[T] {
	nm, err := NewNamedMap(factories...)
	if err != nil {
		panic(err)
	}
	return nm
}

func (n NamedMap[T]) Get(namestr string) (t T, err error) {
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

func (n NamedMap[T]) Add(factory T) (err error) {
	name := factory.Name()
	if _, ok := n.factories[name]; ok {
		return fmt.Errorf("factory %q already exists", name)
	}

	n.factories[name] = factory
	return nil
}

func (n NamedMap[T]) GetInOrder() []T {
	return n.factoriesInOrder
}
