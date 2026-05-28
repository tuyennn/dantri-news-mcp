from mcp.server.fastmcp import FastMCP
import feedparser
import trafilatura
import re
import math

from bs4 import BeautifulSoup
from cachetools import TTLCache

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

rss_cache = TTLCache(maxsize=100, ttl=300)
article_cache = TTLCache(maxsize=100, ttl=1800)

MAX_CHUNK_SIZE = 1500


def cleanup_text(text: str):
    if not text:
        return ""

    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'\.+', '.', text)

    return text.strip()


def split_chunks(text: str, chunk_size: int = MAX_CHUNK_SIZE):
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        if end >= len(text):
            chunks.append(text[start:])
            break

        split_index = text.rfind('.', start, end)

        if split_index == -1:
            split_index = end

        chunks.append(text[start:split_index + 1])
        start = split_index + 1

    return chunks


def fetch_article(url: str):
    if url in article_cache:
        return article_cache[url]

    downloaded = trafilatura.fetch_url(url)

    if not downloaded:
        return None

    text = trafilatura.extract(downloaded)

    if not text:
        return None

    text = cleanup_text(text)

    article_cache[url] = text

    return text


def generate_summary(text: str, sentences: int = 5):
    summary = ".".join(
        text.split(".")[:sentences]
    ).strip()

    if not summary.endswith("."):
        summary += "."

    return summary


@mcp.tool()
def categories():
    return {
        "categories": list(RSS_FEEDS.keys())
    }


@mcp.tool()
def latest_news(category: str = "home", limit: int = 5):
    if category not in RSS_FEEDS:
        return {
            "error": f"Invalid category: {category}"
        }

    cache_key = f"rss_{category}"

    if cache_key in rss_cache:
        feed = rss_cache[cache_key]
    else:
        feed = feedparser.parse(RSS_FEEDS[category])
        rss_cache[cache_key] = feed

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
        "count": len(articles),
        "articles": articles
    }


@mcp.tool()
def summarize_article(url: str):
    text = fetch_article(url)

    if not text:
        return {
            "error": "Cannot fetch article"
        }

    summary = generate_summary(text)

    return {
        "url": url,
        "summary": summary,
        "content_length": len(text)
    }


@mcp.tool()
def read_article(url: str, chunk: int = 1):
    text = fetch_article(url)

    if not text:
        return {
            "error": "Cannot fetch article"
        }

    chunks = split_chunks(text)

    total_chunks = len(chunks)

    if chunk < 1 or chunk > total_chunks:
        return {
            "error": f"Chunk must be between 1 and {total_chunks}"
        }

    return {
        "url": url,
        "chunk": chunk,
        "total_chunks": total_chunks,
        "has_next": chunk < total_chunks,
        "content": chunks[chunk - 1]
    }


@mcp.tool()
def full_article(url: str):
    text = fetch_article(url)

    if not text:
        return {
            "error": "Cannot fetch article"
        }

    return {
        "url": url,
        "content": text,
        "content_length": len(text)
    }


@mcp.tool()
def article_info(url: str):
    text = fetch_article(url)

    if not text:
        return {
            "error": "Cannot fetch article"
        }

    chunks = split_chunks(text)

    return {
        "url": url,
        "content_length": len(text),
        "estimated_read_time_minutes": math.ceil(
            len(text.split()) / 180
        ),
        "total_chunks": len(chunks)
    }


if __name__ == "__main__":
    mcp.run()
