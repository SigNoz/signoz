package valuer

import (
	"database/sql/driver"
	"encoding/json"
	"reflect"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/google/uuid"
)

var _ Valuer = (*UUID)(nil)

type UUID struct {
	val uuid.UUID
}

func NewUUID(value string) (UUID, error) {
	val, err := uuid.Parse(value)
	if err != nil {
		return UUID{}, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidValuer, "invalid uuid %s", value).WithAdditional(err.Error())
	}

	return UUID{
		val: val,
	}, nil
}

func NewUUIDFromBytes(value []byte) (UUID, error) {
	val, err := uuid.FromBytes(value)
	if err != nil {
		return UUID{}, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidValuer, "invalid uuid %s", value).WithAdditional(err.Error())
	}

	return UUID{
		val: val,
	}, nil
}

func MustNewUUID(val string) UUID {
	uuid, err := NewUUID(val)
	if err != nil {
		panic(err)
	}

	return uuid
}

func GenerateUUID() UUID {
	val, err := uuid.NewV7()
	if err != nil {
		panic(err)
	}

	return UUID{
		val: val,
	}
}

func (enum UUID) IsZero() bool {
	return enum.val == uuid.UUID{}
}

func (enum UUID) StringValue() string {
	return enum.val.String()
}

func (enum UUID) String() string {
	return enum.val.String()
}

func (enum UUID) MarshalBinary() ([]byte, error) {
	return enum.val.MarshalBinary()
}

func (enum UUID) MarshalJSON() ([]byte, error) {
	return json.Marshal(enum.StringValue())
}

func (enum *UUID) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}

	uuid, err := NewUUID(str)
	if err != nil {
		return err
	}

	*enum = uuid
	return nil
}

func (enum UUID) Value() (driver.Value, error) {
	return enum.StringValue(), nil
}

func (enum *UUID) Scan(val interface{}) error {
	if enum == nil {
		return errors.Newf(errors.TypeInternal, ErrCodeUnknownValuerScan, "uuid: (nil \"%s\")", reflect.TypeOf(enum).String())
	}

	if val == nil {
		return errors.Newf(errors.TypeInternal, ErrCodeUnknownValuerScan, "uuid: (nil \"%s\")", reflect.TypeOf(val).String())
	}

	var enumVal UUID
	switch val := val.(type) {
	case string:
		_enumVal, err := NewUUID(val)
		if err != nil {
			return errors.Newf(errors.TypeInternal, ErrCodeUnknownValuerScan, "uuid: (invalid-uuid \"%s\")", err.Error())
		}
		enumVal = _enumVal
	case []byte:
		_enumVal, err := NewUUIDFromBytes(val)
		if err != nil {
			return errors.Newf(errors.TypeInternal, ErrCodeUnknownValuerScan, "uuid: (invalid-uuid \"%s\")", err.Error())
		}
		enumVal = _enumVal
	default:
		return errors.Newf(errors.TypeInternal, ErrCodeUnknownValuerScan, "uuid: (non-uuid \"%s\")", reflect.TypeOf(val).String())
	}

	*enum = enumVal
	return nil
}

func (enum *UUID) UnmarshalText(text []byte) error {
	uuid, err := NewUUID(string(text))
	if err != nil {
		return err
	}

	*enum = uuid
	return nil
}

func (enum UUID) MarshalText() (text []byte, err error) {
	return []byte(enum.StringValue()), nil
}
