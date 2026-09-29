"""Publish owner-authored documentation Issues; keep immutable MD/HTML revisions."""
import hashlib
import base64
import html
import json
import os
from pathlib import Path
import urllib.request


def api(path):
    request = urllib.request.Request(
        "https://api.github.com" + path,
        headers={"Authorization": "Bearer " + os.environ["GH_TOKEN"],
                 "Accept": "application/vnd.github.full+json",
                 "X-GitHub-Api-Version": "2022-11-28"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def render(issue):
    script = (Path(__file__).parent.parent / "assets/code-blocks.js").read_text(encoding="utf-8") + "\n" + Path(__file__).with_name("article.js").read_text(encoding="utf-8")
    css = Path(__file__).with_name("article.css").read_text(encoding="utf-8") + "\n" + (Path(__file__).parent.parent / "assets/code-blocks.css").read_text(encoding="utf-8")
    script_hash = base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
    title = html.escape(issue["title"])
    source = html.escape(issue["html_url"], quote=True)
    # body_html is rendered and sanitized by GitHub, never raw Issue HTML.
    body = issue.get("body_html")
    if body is None:
        raise ValueError("GitHub did not return rendered body_html")
    markdown_path = html.escape(issue.get("markdown_path", f"/blog/md/{issue['number']}.md"), quote=True)
    date = html.escape(issue["updated_at"][:10])
    return f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f5f4f0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-{script_hash}'; img-src https: data:; media-src https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>{title} · DATXY</title>
<style>{css}</style></head><body id="article-top">
<header class="article-header"><a class="article-brand" href="/">DATXY<span>.</span></a><nav aria-label="主导航"><a href="/">资源目录</a><a href="/?category=Article#explore">文章笔记</a></nav></header>
<div class="article-layout"><main><div class="article-eyebrow">DATXY NOTES / 技术与探索</div>
<h1 class="article-title">{title}</h1><div class="article-meta"><span>更新 <time datetime="{date}">{date}</time></span><a href="{source}" target="_blank" rel="noopener noreferrer">原始 Issue ↗</a><a href="{markdown_path}" download>下载 Markdown ↓</a></div>
<article>{body}</article><footer class="article-footer"><a href="/?category=Article#explore">← 浏览更多笔记</a><span>KEEP LEARNING, KEEP EXPLORING.</span></footer>
</main><aside class="toc-slot" aria-label="文章目录"></aside></div>
<a class="back-top" href="#article-top" aria-label="返回顶部">↑</a><script>{script}</script></body></html>
"""


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8")


def publish(root, issues, owner):
    root = Path(root)
    index = root / "data/posts.json"
    existing = json.loads(index.read_text(encoding="utf-8")) if index.exists() else []
    # Preserve manually maintained entries, rebuild only our Issue entries.
    posts = [p for p in existing if p.get("source") != "github-issue"]
    for issue in issues:
        labels = {label["name"] for label in issue.get("labels", [])}
        if ("pull_request" in issue or issue["user"]["login"].lower() != owner.lower()
                or "documentation" not in labels):
            continue
        number = int(issue["number"])
        issue = {**issue, "number": number}
        md = "# " + issue["title"] + "\n\n" + (issue.get("body") or "") + "\n"
        page = render(issue)
        write(root / f"blog/{number}.html", page)
        write(root / f"blog/md/{number}.md", md)
        stem = f"issue-{number}"
        revision = hashlib.sha256((md + page).encode()).hexdigest()[:16]
        for extension, content in [("md", md), ("html", page)]:
            write(root / f"blog/posts/{stem}.{extension}", content)
            backup = root / f"blog/backups/{stem}/{revision}.{extension}"
            if not backup.exists():
                write(backup, content)
        posts.append({
            "source": "github-issue", "issue": number, "isArticle": True, "cat": "log",
            "title": issue["title"], "desc": (issue.get("body_text") or issue.get("body") or "")[:180],
            "content": issue.get("body_text") or issue.get("body") or "",
            "tag": sorted(labels), "date": issue["created_at"][:10],
            "updated_at": issue["updated_at"], "url": f"/blog/{number}.html",
            "markdown": f"/blog/md/{number}.md", "issue_url": issue["html_url"]})
    posts.sort(key=lambda p: p.get("updated_at", p.get("date", "")), reverse=True)
    for path in ["data/posts.json", "data/search.json"]:
        write(root / path, json.dumps(posts, ensure_ascii=False, indent=2) + "\n")
    return posts


def main():
    repo = os.environ["GITHUB_REPOSITORY"]
    issues = []
    page = 1
    while True:
        batch = api(f"/repos/{repo}/issues?state=all&per_page=100&page={page}")
        issues.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    publish(".", issues, repo.split("/")[0])


if __name__ == "__main__":
    main()
