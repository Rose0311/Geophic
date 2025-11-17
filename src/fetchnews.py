import os
import json
import asyncio
from flask import Flask, jsonify, request
from dotenv import load_dotenv
import re
from flask_cors import CORS

# LangChain and MCP imports
from langchain_core.messages import HumanMessage, ToolMessage
from langchain_groq import ChatGroq
from langchain_mcp_adapters.tools import load_mcp_tools
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain.agents import create_agent

# --- Configuration ---
load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    print("FATAL ERROR: GROQ_API_KEY not found in .env file.")

model = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0,
    api_key=groq_api_key,
)

server_params = StdioServerParameters(
    command="docker",
    args=[
        "run",
        "--rm",
        "-i",
        "-e",
        f"NEWS_API_KEY={os.getenv('NEWS_API_KEY')}",
        "mcp/news-api",
    ],
)

# Flask app setup
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# ---------------------------------------------------------------------
# ⚡ FAST TOOL EXECUTION
# ---------------------------------------------------------------------


async def run_direct_tool_call(country: str, category: str):
    """Executes the search-news tool directly with a minimal, clean query."""
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await load_mcp_tools(session)

            news_tool = next((t for t in tools if t.name == "search-news"), None)

            if not news_tool:
                print("Error: search-news tool not found.")
                return {"raw": "Error: search-news tool not available."}

            # 1. DEFINE THE CLEAN, SIMPLE QUERY
            if category and category != "general":
                # Example: "India Technology news"
                query = f"{country} {category} news headlines"
            else:
                # Example: "India latest news"
                query = f"{country} latest news"

            print(f"Tool Query: {query}")

            # 2. Call the tool directly
            try:
                tool_result = await news_tool.ainvoke({"query": query})
                return {"raw": str(tool_result)}

            except Exception as e:
                print(f"Error during direct tool invocation: {repr(e)}")
                raise


# ---------------------------------------------------------------------
# Parsing Logic (Robust against inconsistent output)
# ---------------------------------------------------------------------


def parse_headlines(raw_text):
    """Parses raw text output into a list of dicts."""
    if (
        raw_text is None
        or "no headlines found" in raw_text.lower()
        or "no articles found" in raw_text.lower()
        or "no results" in raw_text.lower()
    ):
        print("Parser found explicit 'no results' message.")
        return []

    headlines = []
    # Split by '---' to separate articles
    articles = raw_text.split("---")

    for article in articles:
        # Require a Title to consider it a valid article
        if "Title:" not in article:
            continue

        title_match = re.search(r"Title:\s*(.+?)(?:\n|$)", article, re.IGNORECASE)
        url_match = re.search(r"URL:\s*(.+?)(?:\n|$)", article, re.IGNORECASE)
        source_match = re.search(r"Source:\s*(.+?)(?:\n|$)", article, re.IGNORECASE)
        published_match = re.search(
            r"Published:\s*(.+?)(?:\n|$)", article, re.IGNORECASE
        )

        headline = {
            "title": title_match.group(1).strip() if title_match else "No title",
            "url": url_match.group(1).strip() if url_match else None,
            "source": source_match.group(1).strip() if source_match else None,
            "published": published_match.group(1).strip() if published_match else None,
        }

        # Only append if a title was successfully parsed
        if headline["title"] != "No title":
            headlines.append(headline)

    return headlines


# ---------------------------------------------------------------------
# Flask Route
# ---------------------------------------------------------------------


@app.route("/news", methods=["GET"])
def get_news():
    # The frontend passes the complex query structure in 'prompt' but we need the country name.
    # We will attempt to extract the country name from the start of the prompt for robustness.
    full_prompt = request.args.get("prompt", "")
    category = request.args.get("category", "general")

    # ⚡ Extract the country name (e.g., "India" from "What are the 4 latest news headlines about India...")
    country_match = re.search(
        r"about\s+([\w\s]+?)(?:\sin|$)", full_prompt, re.IGNORECASE
    )
    country = country_match.group(1).strip() if country_match else "Global"

    if not country:
        return jsonify({"error": "Could not determine country from prompt."}), 400

    print(f"\n--- Request for: {country} / {category} ---")

    try:
        # Primary call using the FAST direct tool execution
        raw_data = asyncio.run(run_direct_tool_call(country, category))
    except Exception as e:
        print(f"CRITICAL ERROR in news fetching: {repr(e)}")
        # Return a custom error object that the frontend can display
        return (
            jsonify(
                {
                    "headlines": [
                        {
                            "title": f"API Error: Check backend logs. ({type(e).__name__})",
                            "source": "System",
                        }
                    ]
                }
            ),
            500,
        )

    headlines = []

    if isinstance(raw_data, dict) and "raw" in raw_data:
        # Attempt to parse the raw text output
        headlines = parse_headlines(raw_data["raw"])

    print(f"Parsed {len(headlines)} headlines.")

    if not headlines:
        # If parsing yields zero results, return the "no news" message
        return jsonify(
            {
                "headlines": [
                    {
                        "title": "No news found for this category/country.",
                        "source": "News Tool",
                    }
                ]
            }
        )

    return jsonify({"headlines": headlines})


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
