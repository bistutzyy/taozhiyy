import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ProjectGalleryDeploymentTests(unittest.TestCase):
    def test_main_build_includes_the_project_site(self):
        package = json.loads((ROOT / 'main/package.json').read_text(encoding='utf-8'))
        self.assertIn('node ../tools/build-project-gallery.mjs', package['scripts']['build'])
        script = (ROOT / 'tools/build-project-gallery.mjs').read_text(encoding='utf-8')
        self.assertIn("'ci'", script)
        self.assertIn("'test'", script)
        self.assertIn("'build:site'", script)
        self.assertIn("'main/dist/projects'", script)
        self.assertNotIn('/opt/acg-api', script)

    def test_site_build_uses_its_own_base_and_keeps_preview_mode(self):
        package = json.loads((ROOT / 'previews/project-gallery/package.json').read_text(encoding='utf-8'))
        self.assertIn('--base=/projects/', package['scripts']['build:site'])
        self.assertEqual(package['scripts']['dev'], 'vite --host 127.0.0.1')
        source = (ROOT / 'previews/project-gallery/src/catalog.js').read_text(encoding='utf-8')
        self.assertIn('import.meta.env?.BASE_URL', source)

    def test_ci_covers_project_gallery_updates(self):
        workflow = (ROOT / '.github/workflows/deploy.yml').read_text(encoding='utf-8')
        self.assertEqual(workflow.count('"previews/project-gallery/**"'), 2)
        self.assertIn('previews/project-gallery/package-lock.json', workflow)
        self.assertNotIn('self-hosted', workflow)

    def test_service_worker_does_not_take_over_the_independent_project_site(self):
        source = (ROOT / 'main/public/sw.js').read_text(encoding='utf-8')
        self.assertIn('if (url.pathname.startsWith("/projects/")) return;', source)


if __name__ == '__main__':
    unittest.main()
