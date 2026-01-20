package implsavedview

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	sqlstore sqlstore.SQLStore
}

func NewModule(sqlstore sqlstore.SQLStore) savedview.Module {
	return &module{sqlstore: sqlstore}
}

func (module *module) GetViewsForFilters(ctx context.Context, orgID string, sourcePage string, name string, category string) ([]*v3.SavedView, error) {
	var views []types.SavedView
	var err error
	if len(category) == 0 {
		err = module.sqlstore.BunDB().NewSelect().Model(&views).Where("org_id = ? AND source_page = ? AND name LIKE ?", orgID, sourcePage, "%"+name+"%").Scan(ctx)
	} else {
		err = module.sqlstore.BunDB().NewSelect().Model(&views).Where("org_id = ? AND source_page = ? AND category LIKE ? AND name LIKE ?", orgID, sourcePage, "%"+category+"%", "%"+name+"%").Scan(ctx)
	}
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error in getting saved views")
	}

	var savedViews []*v3.SavedView
	for _, view := range views {
		var compositeQuery v3.CompositeQuery
		err = json.Unmarshal([]byte(view.Data), &compositeQuery)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "error in unmarshalling explorer query data: %s", err.Error())
		}
		savedViews = append(savedViews, &v3.SavedView{
			ID:             view.ID,
			Name:           view.Name,
			CreatedAt:      view.CreatedAt,
			CreatedBy:      view.CreatedBy,
			UpdatedAt:      view.UpdatedAt,
			UpdatedBy:      view.UpdatedBy,
			Tags:           strings.Split(view.Tags, ","),
			SourcePage:     view.SourcePage,
			CompositeQuery: &compositeQuery,
			ExtraData:      view.ExtraData,
		})
	}
	return savedViews, nil
}

func (module *module) CreateView(ctx context.Context, orgID string, view v3.SavedView) (valuer.UUID, error) {
	data, err := json.Marshal(view.CompositeQuery)
	if err != nil {
		return valuer.UUID{}, errors.WrapInternalf(err, errors.CodeInternal, "error in marshalling explorer query data")
	}

	uuid := valuer.GenerateUUID()
	createdAt := time.Now()
	updatedAt := time.Now()

	claims, errv2 := authtypes.ClaimsFromContext(ctx)
	if errv2 != nil {
		return valuer.UUID{}, errors.NewInternalf(errors.CodeInternal, "error in getting email from context")
	}

	createBy := claims.Email
	updatedBy := claims.Email

	dbView := types.SavedView{
		TimeAuditable: types.TimeAuditable{
			CreatedAt: createdAt,
			UpdatedAt: updatedAt,
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: createBy,
			UpdatedBy: updatedBy,
		},
		OrgID: orgID,
		Identifiable: types.Identifiable{
			ID: uuid,
		},
		Name:       view.Name,
		Category:   view.Category,
		SourcePage: view.SourcePage,
		Tags:       strings.Join(view.Tags, ","),
		Data:       string(data),
		ExtraData:  view.ExtraData,
	}

	_, err = module.sqlstore.BunDB().NewInsert().Model(&dbView).Exec(ctx)
	if err != nil {
		return valuer.UUID{}, errors.WrapInternalf(err, errors.CodeInternal, "error in creating saved view")
	}
	return uuid, nil
}

func (module *module) GetView(ctx context.Context, orgID string, uuid valuer.UUID) (*v3.SavedView, error) {
	var view types.SavedView
	err := module.sqlstore.BunDB().NewSelect().Model(&view).Where("org_id = ? AND id = ?", orgID, uuid.StringValue()).Scan(ctx)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error in getting saved view")
	}

	var compositeQuery v3.CompositeQuery
	err = json.Unmarshal([]byte(view.Data), &compositeQuery)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error in unmarshalling explorer query data")
	}
	return &v3.SavedView{
		ID:             view.ID,
		Name:           view.Name,
		Category:       view.Category,
		CreatedAt:      view.CreatedAt,
		CreatedBy:      view.CreatedBy,
		UpdatedAt:      view.UpdatedAt,
		UpdatedBy:      view.UpdatedBy,
		SourcePage:     view.SourcePage,
		Tags:           strings.Split(view.Tags, ","),
		CompositeQuery: &compositeQuery,
		ExtraData:      view.ExtraData,
	}, nil
}

func (module *module) UpdateView(ctx context.Context, orgID string, uuid valuer.UUID, view v3.SavedView) error {
	data, err := json.Marshal(view.CompositeQuery)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "error in marshalling explorer query data")
	}

	claims, errv2 := authtypes.ClaimsFromContext(ctx)
	if errv2 != nil {
		return errors.NewInternalf(errors.CodeInternal, "error in getting email from context")
	}

	updatedAt := time.Now()
	updatedBy := claims.Email

	_, err = module.sqlstore.BunDB().NewUpdate().
		Model(&types.SavedView{}).
		Set("updated_at = ?, updated_by = ?, name = ?, category = ?, source_page = ?, tags = ?, data = ?, extra_data = ?",
			updatedAt, updatedBy, view.Name, view.Category, view.SourcePage, strings.Join(view.Tags, ","), data, view.ExtraData).
		Where("id = ?", uuid.StringValue()).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "error in updating saved view")
	}
	return nil
}

func (module *module) DeleteView(ctx context.Context, orgID string, uuid valuer.UUID) error {
	_, err := module.sqlstore.BunDB().NewDelete().
		Model(&types.SavedView{}).
		Where("id = ?", uuid.StringValue()).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "error in deleting explorer query")
	}
	return nil
}

func (module *module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	savedViews := []*types.SavedView{}

	err := module.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&savedViews).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return types.NewStatsFromSavedViews(savedViews), nil
}
