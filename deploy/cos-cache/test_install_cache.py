import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch


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
        http = self.mod.HTTP_CONFIG
        self.assertIn("proxy_cache $taozhiyy_cos_cache_zone;", config)
        self.assertIn('map "$taozhiyy_cos_not_image$taozhiyy_cos_bad_method$taozhiyy_cos_nonstandard" $taozhiyy_cos_cache_zone', http)
        self.assertIn('default off;\n    "000" taozhiyy_cos_images;', http)
        self.assertIn('map "$http_authorization|$http_range|$args"', http)
        self.assertIn("$taozhiyy_cos_bad_status", config)
        self.assertIn("proxy_cache_valid 200 1d;", config)
        self.assertNotIn("206 1d", config)
        self.assertNotIn("proxy_ignore_headers", config)
        self.assertNotIn("proxy_set_header Range", config)

    def test_origin_verification_precedes_shared_cache_and_is_not_public(self):
        self.assertIn("proxy_ssl_verify on;", self.mod.LOCATION_CONFIG)
        self.assertIn("proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;", self.mod.LOCATION_CONFIG)
        self.assertIn('proxy_cache_key "verified-v2|', self.mod.LOCATION_CONFIG)
        self.assertIn("127.0.0.1 $upstream_status;", self.mod.HTTP_CONFIG)
        self.assertIn("add_header X-Taozhiyy-Origin-Status $taozhiyy_cos_local_origin_status", self.mod.LOCATION_CONFIG)

    def test_video_probe_rejects_a_locally_synthesized_partial_response(self):
        image = {"sha256": "original"}
        response = {"status": 206, "origin_status": "200", "bytes": 1, "cache": "BYPASS", "range": "bytes 0-0/100"}
        with patch.object(self.mod, "fetch", side_effect=[
            image, image, {**image, "cache": "HIT"}, {**image, "cache": "BYPASS"}, response,
        ]):
            with self.assertRaisesRegex(RuntimeError, "did not directly return"):
                self.mod.verify()

    def test_cache_has_bounded_disk_usage(self):
        self.assertIn("max_size=256m", self.mod.HTTP_CONFIG)
        self.assertIn("keys_zone=taozhiyy_cos_images:8m", self.mod.HTTP_CONFIG)


if __name__ == "__main__":
    unittest.main()
