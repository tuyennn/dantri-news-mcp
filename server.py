from mcp.server.fastmcp import FastMCP
import feedparser
import trafilatura
from bs4 import BeautifulSoup

mcp = FastMCP("dantri-news")

RSS_FEEDS = {
    "home": "https://dantri.com.vn/rss/home.rss",
    "world": "https://dantri.com.vn/rss/the-gioi.rss",
    "business": "https://dantri.com.vn/rss/kinh-doanh.rss",
    "technology": "https://dantri.com.vn/rss/cong-nghe.rss",
    "sport": "https://dantri.com.vn/rss/the-thao.rss",
    "education": "https://dantri.com.vn/rss/giao-duc.rss",
    "society": "https://dantri.com.vn/rss/xa-hoi.rss"
}


@mcp.tool()
def latest_news(category: str = "home", limit: int = 5):
    """Get latest Dantri news"""

    feed_url = RSS_FEEDS.get(category)

    if not feed_url:
        return {
            "error": f"Invalid category: {category}"
        }

    feed = feedparser.parse(feed_url)

    articles = []

    for item in feed.entries[:limit]:
        articles.append({
            "title": item.get("title", ""),
            "link": item.get("link", ""),
            "published": item.get("published", ""),
            "summary": BeautifulSoup(
                item.get("summary", ""),
                "html.parser"
            ).text.strip()
        })

    return {
        "category": category,
        "articles": articles
    }


@mcp.tool()
def summarize_article(url: str):
    """Summarize Dantri article"""

    downloaded = trafilatura.fetch_url(url)

    if not downloaded:
        return {
            "error": "Cannot fetch article"
        }

    text = trafilatura.extract(downloaded)

    if not text:
        return {
            "error": "Cannot extract article"
        }

    summary = ".".join(
        text.split(".")[:5]
    ).strip() + "."

    return {
        "url": url,
        "summary": summary
    }


@mcp.tool()
def categories():
    """Get available categories"""

    return list(RSS_FEEDS.keys())


if __name__ == "__main__":
    mcp.run()
