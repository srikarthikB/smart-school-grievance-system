from pathlib import Path
import unittest

from alembic.config import Config
from alembic.script import ScriptDirectory


BACKEND_DIR = Path(__file__).resolve().parents[1]
MAX_REVISION_LENGTH = 32


class MigrationRevisionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        config = Config()
        config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
        cls.revisions = list(ScriptDirectory.from_config(config).walk_revisions())

    def test_revision_ids_fit_alembic_version_column(self):
        self.assertTrue(self.revisions, "No Alembic revisions were discovered")
        too_long = [
            revision.revision
            for revision in self.revisions
            if len(revision.revision) > MAX_REVISION_LENGTH
        ]
        self.assertEqual(too_long, [])

    def test_down_revision_references_resolve(self):
        revision_ids = {revision.revision for revision in self.revisions}
        for revision in self.revisions:
            parents = revision.down_revision
            if parents is None:
                continue
            if isinstance(parents, str):
                parents = (parents,)
            for parent in parents:
                with self.subTest(revision=revision.revision, down_revision=parent):
                    self.assertIn(parent, revision_ids)


if __name__ == "__main__":
    unittest.main()
