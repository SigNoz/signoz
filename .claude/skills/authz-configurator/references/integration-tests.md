# Authz Integration Tests Reference

Existing authz suites to imitate: `integration/tests/role/` (managed roles, custom-role CRUD, FGA scoping), `integration/tests/serviceaccount/` (API-key auth by role, role assignment), `integration/tests/passwordauthn/04_role.py` (user role changes, editor denied on admin endpoints).

## Where a new test goes

- Suite package: `tests/integration/tests/<suite>/` — pick the existing suite matching the feature's domain, or create a new package when the feature is its own domain.
- File name: two-digit ordered prefix, `NN_<topic>.py` (`03_fga.py`, `04_roles.py`). Files in a suite run in order; setup tests early in the file establish state that later tests use.
- Golden/testdata JSON: `tests/integration/testdata/<suite>/`, loaded via `fixtures.fs.get_testdata_file_path`.
- If the change touched `ManagedRoleToTransactions`, update `tests/integration/testdata/role/managed_role_transactions.json` — `role/01_register.py` asserts every managed role's verb/type/kind matrix against it.

## Environment and running

`make` targets run from the repo root; direct `uv run pytest` commands run from `tests/`:

```bash
make py-test-setup                # repo root — boot the stack once (~4 min), keep it with --reuse
cd tests
uv run pytest --basetemp=./tmp/ -vv --reuse integration/tests/<suite>/
uv run pytest --basetemp=./tmp/ -vv --reuse integration/tests/role/03_fga.py::test_read_scoped_to_granted_role
make py-test-teardown             # repo root — destroy when done; never mix --reuse and --teardown
make py-fmt && make py-lint       # repo root — mandatory before finishing
```

## Fixtures you'll need

From `tests/fixtures/auth.py` (registered via `pytest_plugins` in `tests/conftest.py`):

- `signoz: types.SigNoz` — the running stack; build URLs with `signoz.self.host_configs["8080"].get("/api/v1/...")`.
- `create_user_admin` — package-scoped; registers the first admin (`USER_ADMIN_EMAIL` / `USER_ADMIN_PASSWORD`). Take it as an unused argument in every test that needs the org to exist.
- `get_token(email, password) -> str` — bearer token for a user.
- `add_license(signoz, make_http_mocks, get_token)` — custom roles are enterprise-only; call it in a `test_apply_license` at the top of any suite that creates custom roles.
- `create_active_user(signoz, admin_token, email=..., role="VIEWER", password=..., name=...) -> user_id` — invite + activate.
- `change_user_role(signoz, admin_token, user_id, old_role, new_role)` — e.g. `"signoz-viewer"` → your custom role name.

From `tests/fixtures/role.py`:

- `create_role(token, name, transaction_groups=None, description="") -> role_id` (fixture).
- `find_role_id(token, name) -> role_id` (fixture).
- `transaction_group(relation, type_name, kind_name, selectors)` — builds one permission entry, e.g. `transaction_group("read", "metaresource", "thing", ["*"])` or with a specific instance name/ID as selector.

From `tests/fixtures/serviceaccount.py`:

- `create_service_account_with_key(signoz, token, name, role="signoz-admin") -> (sa_id, api_key)`.
- Service accounts authenticate with the header `SIGNOZ-API-KEY: <key>`; users with `Authorization: Bearer <token>`.

Hard rule: inline `requests.get/post/put/delete` calls directly in tests — do not wrap single API calls in helper functions or fixtures. Always pass `timeout=5`. Include the response text in assertion messages so failures are diagnosable.

## Shape 1: managed-role matrix (community-safe)

For each role, assert the expected status on each new route. Pattern from `serviceaccount/03_auth.py`:

```python
def test_editor_forbidden_on_admin_endpoint(signoz, create_user_admin, get_token):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    _, api_key = create_service_account_with_key(signoz, token, "sa-role-editor", role="signoz-editor")

    resp = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/service_accounts"),
        headers={"SIGNOZ-API-KEY": api_key},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"expected 403, got {resp.status_code}: {resp.text}"
```

The user-token variant creates an editor/viewer via `create_active_user` and asserts 403 on the route, 200 for admin.

## Shape 2: per-object FGA scoping (enterprise, custom role)

Grant instance verbs on one object only; assert the other stays forbidden. Structure from `role/03_fga.py`:

```python
def test_apply_license(signoz, create_user_admin, make_http_mocks, get_token):
    add_license(signoz, make_http_mocks, get_token)


def test_setup_actor(signoz, create_user_admin, get_token, create_role):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    create_role(
        admin_token,
        "thing-fga-actor",
        [
            transaction_group("read", "metaresource", "thing", [_TARGET_A_ID]),
            transaction_group("list", "metaresource", "thing", ["*"]),
        ],
    )
    user_id = create_active_user(signoz, admin_token, email=_ACTOR_EMAIL, role="VIEWER", password=_ACTOR_PASSWORD, name="thing fga actor")
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", "thing-fga-actor")


def test_read_scoped_to_grant(signoz, create_user_admin, get_token):
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/things/{_TARGET_A_ID}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/things/{_TARGET_B_ID}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"expected 403, got {resp.status_code}: {resp.text}"
```

Key semantics to test (they mirror the selector rules on the route side):

- `read`/`update`/`delete` granted on a specific selector authorize only that instance; `*` authorizes all.
- `create` and `list` are collection-scoped — only a `*` grant makes them pass, and `list` on `*` returns every instance including ones the caller can't `read` individually.
- Revoking the grant (update the role's transaction groups, or `change_user_role` back) flips the previously-allowed call to 403.

Module-level constants for names/emails (see `role/03_fga.py` — `_ACTOR_ROLE_NAME`, `_TARGET_A`) keep the setup test and the assertion tests in sync.

## What "done" looks like

- Every new route appears in at least one allow case and one deny case.
- Suites that create custom roles start with `test_apply_license`.
- `make py-fmt && make py-lint` pass.
- The suite passes against a `--reuse` stack: `uv run pytest --basetemp=./tmp/ -vv --reuse integration/tests/<suite>/`.
