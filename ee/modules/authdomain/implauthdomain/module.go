package implauthdomain

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/ee/modules/authdomain"
	"github.com/SigNoz/signoz/ee/query-service/model"
	"github.com/SigNoz/signoz/ee/types"
	"github.com/SigNoz/signoz/pkg/errors"
)

type module struct {
	store types.AuthDomainStore
}

func NewModule(store types.AuthDomainStore) authdomain.Module {
	return &module{
		store: store,
	}
}

func (m *module) GetAuthDomainByEmail(ctx context.Context, email string) (*types.GettableOrgDomain, error) {

	if email == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "email is required")
	}

	components := strings.Split(email, "@")
	if len(components) < 2 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to start transaction")
	}

	domain, err := m.store.GetDomainByName(ctx, components[1])
	if err != nil {
		return nil, err
	}

	gettableDomain := &types.GettableOrgDomain{StorableOrgDomain: *domain}
	if err := gettableDomain.LoadConfig(domain.Data); err != nil {
		return nil, model.InternalError(err)
	}
	return gettableDomain, nil
}
