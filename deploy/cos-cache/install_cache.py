#!/usr/bin/python3
"""Install and verify a bounded, public-original-image cache without changing COS."""

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


INCLUDE = "include /etc/nginx/snippets/taozhiyy-cos-image-cache*.conf;"
# Accept upgrades only from the exact v1 snippets installed by this tool.
V1_HTTP_HASH = "b2fce0df69ea7df1a01d7378e07f5810099a061a90c33c7856e7fac3ee165485"
V1_LOCATION_HASH = "384d96e84ac6dc6a6b6dfd568444d2d33ea261f548595ab919cb837fdf75aec4"
HTTP_CONFIG = r"""# Managed public-original-image cache. Audio/video Range requests bypass it.
proxy_cache_path /var/cache/nginx/taozhiyy-cos levels=1:2 keys_zone=taozhiyy_cos_images:8m max_size=256m inactive=7d use_temp_path=off;
map $uri $taozhiyy_cos_not_image {
    default 1;
    ~*^/cos/.+\.(avif|gif|ico|jpe?g|png|webp)$ 0;
}
map $request_method $taozhiyy_cos_bad_method {
    default 1;
    GET 0;
    HEAD 0;
}
map "$http_authorization|$http_range|$args" $taozhiyy_cos_nonstandard {
    default 1;
    "||" 0;
}
map "$taozhiyy_cos_not_image$taozhiyy_cos_bad_method$taozhiyy_cos_nonstandard" $taozhiyy_cos_cache_zone {
    default off;
    "000" taozhiyy_cos_images;
}
map $upstream_status $taozhiyy_cos_bad_status {
    default 1;
    200 0;
}
map "$taozhiyy_cos_cache_zone|$upstream_cache_status" $taozhiyy_cos_cache_status {
    default $upstream_cache_status;
    "off|" BYPASS;
}
map $remote_addr $taozhiyy_cos_local_origin_status {
    default "";
    127.0.0.1 $upstream_status;
}
"""
LOCATION_CONFIG = """# Cache only public, whole-image GET/HEAD responses; preserve all original URLs.
proxy_ssl_verify on;
proxy_ssl_verify_depth 3;
proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
proxy_cache $taozhiyy_cos_cache_zone;
proxy_cache_key "verified-v2|$scheme|$proxy_host|$request_uri";
proxy_cache_valid 200 1d;
proxy_cache_lock on;
proxy_cache_lock_timeout 5s;
proxy_cache_revalidate on;
proxy_no_cache $taozhiyy_cos_bad_status;
add_header X-Taozhiyy-Cache $taozhiyy_cos_cache_status always;
add_header X-Taozhiyy-Origin-Status $taozhiyy_cos_local_origin_status always;
"""


def patch_snippet(text):
    if "https://tzyy-1330068502.cos.ap-beijing.myqcloud.com/" not in text:
        raise ValueError("Unexpected COS origin; refusing to modify the snippet")
    if INCLUDE in text:
        return text
    pattern = re.compile(r"(?m)^(\s*location /cos/ \{)\s*$")
    if len(pattern.findall(text)) != 1:
        raise ValueError("Expected exactly one known COS location")
    return pattern.sub(lambda match: match[1] + "\n    " + INCLUDE, text, count=1)


def run(arguments):
    result = subprocess.run(arguments, capture_output=True, text=True, timeout=30)
    if result.returncode:
        raise RuntimeError(f"{arguments[0]} failed: {result.stderr[-1500:]}")
    return result


def write_atomic(path, content):
    descriptor, temporary = tempfile.mkstemp(prefix=".taozhiyy-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o644)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def fetch(url, byte_range=None):
    with tempfile.TemporaryDirectory(prefix="taozhiyy-cache-probe-") as directory:
        headers = Path(directory) / "headers"
        body = Path(directory) / "body"
        args = ["curl", "--noproxy", "*", "--silent", "--show-error", "--fail", "--max-time", "20", "--dump-header", str(headers), "--output", str(body)]
        if url.startswith("https://taozhiyy.top/"):
            args += ["--resolve", "taozhiyy.top:443:127.0.0.1"]
        if byte_range:
            args += ["--range", byte_range]
        run(args + [url])
        text = headers.read_text()
        fields = {key.lower(): value.strip() for key, value in re.findall(r"(?m)^([A-Za-z0-9-]+):\s*([^\r\n]*)", text)}
        data = body.read_bytes()
        return {
            "status": int(re.findall(r"HTTP/\S+ (\d{3})", text)[-1]),
            "cache": fields.get("x-taozhiyy-cache"),
            "origin_status": fields.get("x-taozhiyy-origin-status"),
            "sha256": hashlib.sha256(data).hexdigest(),
            "bytes": len(data),
            "range": fields.get("content-range"),
        }


def verify():
    origin = fetch("https://tzyy-1330068502.cos.ap-beijing.myqcloud.com/1.png")
    first = fetch("https://taozhiyy.top/cos/1.png")
    second = fetch("https://taozhiyy.top/cos/1.png")
    if not (origin["sha256"] == first["sha256"] == second["sha256"] and second["cache"] == "HIT"):
        raise RuntimeError("Original-image hash or shared cache HIT verification failed")
    query = fetch("https://taozhiyy.top/cos/1.png?v=taozhiyy-cache-check")
    if query["cache"] != "BYPASS" or query["sha256"] != origin["sha256"]:
        raise RuntimeError("Query bypass verification failed")
    video = fetch("https://taozhiyy.top/cos/AI%E8%87%AA%E5%8A%A8%E5%8C%96%E5%8D%9A%E5%AE%A2%E5%9B%BE%E7%89%87/main/videos/feature-1.mp4", "0-0")
    if not (
        video["status"] == 206
        and video["origin_status"] == "206"
        and video["bytes"] == 1
        and video["cache"] == "BYPASS"
        and re.fullmatch(r"bytes 0-0/[1-9]\d*", video["range"] or "")
    ):
        raise RuntimeError("COS did not directly return the requested video byte range")
    return {"image_first": first, "image_second": second, "query_cache": query["cache"], "video_range": video, "original_bytes_unchanged": True}


def main():
    if os.geteuid() != 0:
        raise PermissionError("Run through sudo after owner-authenticated SSH")
    import pwd
    snippet = Path("/etc/nginx/snippets/taozhiyy-acg-api.conf")
    http = Path("/etc/nginx/conf.d/taozhiyy-cos-image-cache.conf")
    location = Path("/etc/nginx/snippets/taozhiyy-cos-image-cache.conf")
    patched = patch_snippet(snippet.read_text())
    for path, expected, v1_hash in (
        (http, HTTP_CONFIG, V1_HTTP_HASH),
        (location, LOCATION_CONFIG, V1_LOCATION_HASH),
    ):
        if path.exists():
            current = path.read_bytes()
            if current != expected.encode() and hashlib.sha256(current).hexdigest() != v1_hash:
                raise ValueError(f"Existing managed file differs; review before replacing: {path}")
    if shutil.disk_usage("/var").free < 768 * 1024 * 1024:
        raise ValueError("Insufficient disk space for bounded image cache")
    backup = Path("/root") / ("taozhiyy-cos-cache-" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S"))
    backup.mkdir(mode=0o700)
    originals = {}
    for index, path in enumerate((snippet, http, location)):
        copy = backup / str(index)
        originals[path] = copy if path.exists() else None
        if path.exists():
            shutil.copy2(path, copy)
    (backup / "manifest.json").write_text(json.dumps({str(path): str(copy) if copy else None for path, copy in originals.items()}))
    cache = Path("/var/cache/nginx/taozhiyy-cos")
    cache.mkdir(parents=True, exist_ok=True, mode=0o750)
    worker = pwd.getpwnam("www-data")
    os.chown(cache, worker.pw_uid, worker.pw_gid)
    os.chmod(cache, 0o750)
    try:
        write_atomic(http, HTTP_CONFIG)
        write_atomic(location, LOCATION_CONFIG)
        write_atomic(snippet, patched)
        run(["/usr/sbin/nginx", "-t"])
        run(["/usr/bin/systemctl", "reload", "nginx"])
        checks = verify()
    except Exception:
        for path, copy in originals.items():
            if copy:
                shutil.copy2(copy, path)
            elif path.exists():
                path.unlink()
        run(["/usr/sbin/nginx", "-t"])
        run(["/usr/bin/systemctl", "reload", "nginx"])
        raise
    print(json.dumps({"installed": True, "backup": str(backup), "max_cache_mib": 256, "checks": checks}, indent=2))


if __name__ == "__main__":
    main()
