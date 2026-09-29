import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('publisher', ROOT / 'scripts/publish_issues.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


def issue(number=1, **extra):
    return {'number': number, 'title': '<test> & title', 'user': {'login': 'feeday'},
            'labels': [{'name': 'documentation'}], 'body': 'example', 'body_text': 'example',
            'body_html': '<h2>Example</h2><pre lang="python">print(1)\n</pre>',
            'created_at': '2026-09-29T00:00:00Z', 'updated_at': '2026-09-29T01:00:00Z',
            'html_url': f'https://github.com/feeday/url/issues/{number}', **extra}


class PublishingTests(unittest.TestCase):
    def test_imported_entries_survive_local_issue_numbers_and_unpublish(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'data').mkdir()
            imported = {'source': 'imported-github-issue', 'issue': 1,
                        'url': '/blog/imported/cpuck-1.html', 'date': '2026-09-01'}
            (root / 'data/posts.json').write_text(json.dumps([imported]))
            posts = publisher.publish(root, [issue()], 'feeday')
            self.assertEqual(len(posts), 2)
            self.assertTrue((root / 'blog/1.html').exists())
            before = {p.name: p.read_bytes() for p in (root / 'blog/backups/issue-1').iterdir()}
            publisher.publish(root, [issue()], 'feeday')
            self.assertEqual(before, {p.name: p.read_bytes() for p in (root / 'blog/backups/issue-1').iterdir()})
            posts = publisher.publish(root, [issue(labels=[])], 'feeday')
            self.assertEqual(posts, [imported])
            self.assertTrue((root / 'blog/1.html').exists())

    def test_only_owner_documentation_issues_are_published(self):
        with tempfile.TemporaryDirectory() as root:
            posts = publisher.publish(root, [issue(user={'login': 'other'}),
                issue(2, pull_request={}), issue(3, labels=[]), issue(4)], 'feeday')
            self.assertEqual([p['issue'] for p in posts], [4])

    def test_template_escapes_title_and_hashes_actual_inline_script(self):
        output = publisher.render(issue())
        self.assertIn('&lt;test&gt; &amp; title', output)
        script = re.search(r'<script>([\s\S]*)</script>', output).group(1)
        digest = base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
        self.assertIn("script-src 'sha256-" + digest + "'", output)
        self.assertIn('count > 10', output)
        self.assertIn('DATXY', output)


if __name__ == '__main__':
    unittest.main()
