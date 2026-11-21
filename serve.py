"""Local server for Neon Tide. Sends no-cache headers so a refresh always loads the newest files.
Usage: python serve.py   then open http://localhost:8737"""
import http.server, functools, os
class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a): pass
root = os.path.dirname(os.path.abspath(__file__))
print('Neon Tide running at http://localhost:8737')
http.server.ThreadingHTTPServer(('127.0.0.1', 8737), functools.partial(NoCache, directory=root)).serve_forever()
