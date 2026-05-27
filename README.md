# Dantri News MCP Server (Python)

MCP Server đọc tin tức từ Dantri.com.vn bằng RSS feed.

## Features

- MCP STDIO Server
- RSS News Reader
- Article Summarizer
- Claude Desktop compatible
- MCPHub compatible
- Xiaozhi compatible
- Docker support

---

# Install

```bash
pip install -r requirements.txt
```

---

# Run

```bash
python server.py
```

---

# Run Directly From GitHub

```bash
npx -y github:YOUR_GITHUB_USERNAME/dantri-news-mcp-python
```

---

# MCPHub Config

```json
{
  "mcpServers": {
    "dantri-news": {
      "command": "python3",
      "args": [
        "/path/to/server.py"
      ]
    }
  }
}
```

---

# Claude Desktop Config

```json
{
  "mcpServers": {
    "dantri-news": {
      "command": "python3",
      "args": [
        "/path/to/server.py"
      ]
    }
  }
}
```

---

# Available Tools

## latest_news

Get latest news by category.

Example:

```json
{
  "category": "technology",
  "limit": 5
}
```

---

## summarize_article

Summarize article content.

Example:

```json
{
  "url": "https://dantri.com.vn/..."
}
```
