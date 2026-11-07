import importlib.util
from pathlib import Path
import unittest


class CacheTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = Path(__file__).with_name("install_cache.py")
        if not path.exists():
            raise AssertionError("Original-image cache installer is not implemented")
        spec = importlib.util.spec_from_file_location("install_cache", path)
        cls.mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.mod)

    def test_only_known_cos_location_is_modified_and_insertion_is_idempotent(self):
        text = 'location /api/ { proxy_pass http://127.0.0.1; }\nlocation /cos/ {\n proxy_pass https://tzyy-1330068502.cos.ap-beijing.myqcloud.com/;\n}\n'
        patched = self.mod.patch_snippet(text)
        self.assertEqual(patched.count(self.mod.INCLUDE), 1)
        self.assertIn(text.splitlines()[0], patched)
        self.assertEqual(self.mod.patch_snippet(patched), patched)
        with self.assertRaises(ValueError):
            self.mod.patch_snippet('location /cos/ { proxy_pass https://unknown.example/; }')

    def test_media_auth_queries_ranges_and_non200_responses_bypass_cache(self):
        config = self.mod.LOCATION_CONFIG
        for variable in ("$taozhiyy_cos_not_image", "$taozhiyy_cos_nonstandard"):
            self.assertIn(variable, config)
        self.assertIn('map "$http_authorization|$http_range|$args"', self.mod.HTTP_CONFIG)
        self.assertIn("$taozhiyy_cos_bad_status", config)
        self.assertIn("proxy_cache_valid 200 1d;", config)
        self.assertNotIn("206 1d", config)
        self.assertNotIn("proxy_ignore_headers", config)
        self.assertNotIn("proxy_set_header Range", config)

    def test_cache_has_bounded_disk_usage(self):
        self.assertIn("max_size=256m", self.mod.HTTP_CONFIG)
        self.assertIn("keys_zone=taozhiyy_cos_images:8m", self.mod.HTTP_CONFIG)


if __name__ == "__main__":
    unittest.main()
