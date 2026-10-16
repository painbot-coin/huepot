import time
import urllib.request

for path in ("/", "/api/auth/providers"):
    started = time.time()
    try:
        with urllib.request.urlopen("http://127.0.0.1:3000" + path, timeout=25) as response:
            body = response.read()
        print(path, response.status, round(time.time() - started, 3), len(body))
    except Exception as error:
        print(path, "ERR", round(time.time() - started, 3), type(error).__name__)
