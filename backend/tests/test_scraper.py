import pytest
import respx
import httpx
import asyncio
from app.services.scraper import fetch_url_text

SAMPLE_HTML = """
<html><body>
<nav>Nav junk</nav>
<article>
  <h1>Photosynthesis Explained</h1>
  <p>Photosynthesis is the process by which plants convert sunlight into glucose.</p>
  <p>It happens in the chloroplasts using carbon dioxide and water.</p>
</article>
<footer>Footer junk</footer>
</body></html>
"""

@respx.mock
def test_extracts_article_text():
    respx.get("https://example.com/article").mock(
        return_value=httpx.Response(200, text=SAMPLE_HTML)
    )
    result = asyncio.get_event_loop().run_until_complete(
        fetch_url_text("https://example.com/article")
    )
    assert "Photosynthesis" in result
    assert "Nav junk" not in result

@respx.mock
def test_raises_on_empty_extraction():
    respx.get("https://example.com/empty").mock(
        return_value=httpx.Response(200, text="<html><body></body></html>")
    )
    with pytest.raises(ValueError, match="Could not extract"):
        asyncio.get_event_loop().run_until_complete(
            fetch_url_text("https://example.com/empty")
        )
