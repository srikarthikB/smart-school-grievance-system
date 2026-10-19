# Test recovery notes

## Intentionally blocked reference cases

- `test_bootstrap_admin_only_succeeds_when_no_admin_exists` and
  `test_bootstrap_requires_long_password` depend on the absent `bootstrap_admin`
  module. They remain blocked pending a separate product decision.
- `test_list_users_outputs_only_public_columns` and
  `test_email_check_is_case_insensitive_and_treats_input_as_data` from the
  reference `test_db_diagnostics.py` depend on the absent database-diagnostics
  helper. They were not copied or run. Any future recovery must use only an
  explicitly injected in-memory engine; they must not access configured
  application database settings.
