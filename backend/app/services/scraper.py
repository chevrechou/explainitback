import httpx
import trafilatura


async def fetch_url_text(url: str) -> str:
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        resp = await client.get(url, headers={"User-Agent": "ExplainItBack/1.0"})
        resp.raise_for_status()
        html = resp.text

    text = trafilatura.extract(html, include_comments=False, include_tables=False)
    if not text:
        raise ValueError("Could not extract readable text from URL")
    return text
