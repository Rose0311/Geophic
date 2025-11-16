import os
import json
import asyncio
from flask import Flask, jsonify, request, make_response
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
    """Executes the search-news tool directly with a category-specific query."""
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await load_mcp_tools(session)

            news_tool = next((t for t in tools if t.name == "search-news"), None)

            if not news_tool:
                print("Error: search-news tool not found.")
                return {"raw": "Error: search-news tool not available."}

            # Construct highly specific queries for each category
            # Use broader queries to get more results
            if category == "general":
                query = f"{country} news"
            elif category == "technology":
                query = f"{country} tech AI innovation"
            elif category == "sports":
                query = f"{country} sports"
            elif category == "entertainment":
                query = f"{country} entertainment celebrity"
            elif category == "business":
                query = f"{country} business economy"
            elif category == "politics":
                query = f"{country} politics election"
            elif category == "health":
                query = f"{country} health medical"
            else:
                query = f"{country} {category}"

            print(f"Search Query: '{query}' | Category: {category}")

            try:
                tool_result = await news_tool.ainvoke({"query": query})
                result_str = str(tool_result)

                # If no results, try a broader search
                if "no articles found" in result_str.lower():
                    print(f"⚠️ No results for specific query, trying broader search...")
                    broader_query = f"{country}"
                    tool_result = await news_tool.ainvoke({"query": broader_query})
                    result_str = str(tool_result)

                result_preview = result_str[:500]
                print(f"API returned: {result_preview}...")
                return {"raw": result_str, "category": category}
            except Exception as e:
                print(f"Error during tool invocation: {repr(e)}")
                raise


# ---------------------------------------------------------------------
# Parsing Logic with Smart Category Filtering
# ---------------------------------------------------------------------


def parse_headlines(raw_text, category=None, country=None):
    """Parses raw text output and applies intelligent category + country filtering."""
    if (
        raw_text is None
        or "no articles found" in raw_text.lower()
        or "no results" in raw_text.lower()
    ):
        print("Parser: No articles found in response.")
        return []

    headlines = []
    seen_urls = set()  # Track URLs to avoid duplicates
    articles = raw_text.split("Article ")

    # Define strong category indicators
    category_keywords = {
        "technology": [
            "tech",
            "ai",
            "software",
            "app",
            "digital",
            "cyber",
            "startup",
            "internet",
            "computer",
            "data",
            "innovation",
            "hardware",
            "device",
            "robot",
            "algorithm",
            "coding",
            "programming",
            "silicon",
            "chipmaker",
            "semiconductor",
            "microsoft",
            "google",
            "meta",
            "apple",
            "amazon",
            "tesla",
        ],
        "sports": [
            "cricket",
            "football",
            "match",
            "game",
            "player",
            "tournament",
            "championship",
            "win",
            "score",
            "team",
            "sport",
            "league",
            "olympic",
            "athlete",
            "coach",
            "stadium",
            "penalty",
            "goal",
            "innings",
            "wicket",
            "fifa",
            "ipl",
            "test match",
            "odi",
            "t20",
            "boxing",
            "tennis",
            "badminton",
            "hockey",
            "kabaddi",
        ],
        "entertainment": [
            "movie",
            "film",
            "actor",
            "actress",
            "music",
            "celebrity",
            "bollywood",
            "hollywood",
            "show",
            "concert",
            "album",
            "award",
            "entertainment",
            "star",
            "grammy",
            "oscar",
            "director",
            "netflix",
            "streaming",
            "series",
            "drama",
            "comedy",
            "theater",
            "cinema",
            "documentary",
        ],
        "business": [
            "business",
            "economy",
            "market",
            "stock",
            "company",
            "finance",
            "trade",
            "bank",
            "revenue",
            "profit",
            "investment",
            "corporate",
            "industry",
            "billion",
            "shares",
            "quarterly",
            "earnings",
            "ceo",
            "merger",
            "ipo",
            "nifty",
            "sensex",
            "rupee",
            "gdp",
            "inflation",
        ],
        "politics": [
            "government",
            "minister",
            "election",
            "parliament",
            "political",
            "policy",
            "vote",
            "leader",
            "party",
            "bjp",
            "congress",
            "law",
            "court",
            "president",
            "senate",
            "legislation",
            "democracy",
            "campaign",
            "modi",
            "rahul",
            "amit shah",
        ],
        "health": [
            "health",
            "medical",
            "hospital",
            "doctor",
            "disease",
            "covid",
            "vaccine",
            "medicine",
            "patient",
            "wellness",
            "treatment",
            "healthcare",
            "pandemic",
            "virus",
            "diagnosis",
            "therapy",
            "clinic",
            "surgery",
            "drug",
            "pharma",
        ],
    }

    # Anti-keywords: if article is about sports, it shouldn't contain these business/health keywords
    category_exclusions = {
        "sports": [
            "business",
            "market",
            "stock",
            "economy",
            "revenue",
            "profit",
            "pharma",
            "drug",
            "medicine",
            "vaccine",
            "hospital",
            "patient",
            "treatment",
        ],
        "technology": ["cricket", "football", "match", "goal", "tournament", "player"],
        "entertainment": ["market", "stock", "economy", "election", "minister"],
        "business": ["cricket", "football", "match", "movie", "actor", "film"],
        "health": ["cricket", "football", "market", "stock", "movie", "actor"],
        "politics": ["cricket", "football", "movie", "actor", "market", "stock"],
    }

    for article in articles:
        if not article.strip() or "Title:" not in article:
            continue

        title_match = re.search(
            r"Title:\s*(.+?)(?:\n|Source:)", article, re.IGNORECASE | re.DOTALL
        )
        url_match = re.search(r"URL:\s*(.+?)(?:\n|$)", article, re.IGNORECASE)
        source_match = re.search(
            r"Source:\s*(.+?)(?:\n|Author:)", article, re.IGNORECASE
        )
        published_match = re.search(
            r"Published:\s*(.+?)(?:\n|$)", article, re.IGNORECASE
        )
        description_match = re.search(
            r"Description:\s*(.+?)(?:\n|URL:)", article, re.IGNORECASE | re.DOTALL
        )

        title_text = title_match.group(1).strip() if title_match else ""
        description_text = (
            description_match.group(1).strip() if description_match else ""
        )
        url = url_match.group(1).strip() if url_match else None

        if not title_text:
            continue

        # Skip duplicates based on URL
        if url and url in seen_urls:
            print(f"  🔄 Duplicate: '{title_text[:60]}...' (same URL)")
            continue
        if url:
            seen_urls.add(url)

        # Apply COUNTRY filtering with smart relaxation
        if country and country.lower() != "global":
            combined_text = f"{title_text} {description_text} {article}".lower()
            country_lower = country.lower()

            # List of related terms/regions that might be relevant
            country_related = {
                "india": [
                    "india",
                    "indian",
                    "delhi",
                    "mumbai",
                    "bengaluru",
                    "bangalore",
                    "bollywood",
                ],
                "australia": [
                    "australia",
                    "australian",
                    "sydney",
                    "melbourne",
                    "aussie",
                    "oz",
                ],
                "china": ["china", "chinese", "beijing", "shanghai", "prc"],
                "usa": [
                    "usa",
                    "us",
                    "america",
                    "american",
                    "united states",
                    "washington",
                ],
                "uk": [
                    "uk",
                    "britain",
                    "british",
                    "england",
                    "london",
                    "scotland",
                    "wales",
                ],
                "canada": ["canada", "canadian", "toronto", "ottawa", "vancouver"],
                "japan": ["japan", "japanese", "tokyo"],
                "germany": ["germany", "german", "berlin"],
                "france": ["france", "french", "paris"],
                "brazil": ["brazil", "brazilian", "brasilia"],
            }

            # Check if article mentions the country or related terms
            country_mentioned = False
            if country_lower in country_related:
                country_mentioned = any(
                    term in combined_text for term in country_related[country_lower]
                )
            else:
                country_mentioned = country_lower in combined_text

            # For sports with two countries (e.g., "India vs Australia"), accept if either country matches
            if not country_mentioned and category == "sports":
                # Check if it's a match involving the country
                if any(
                    keyword in combined_text
                    for keyword in ["vs", "versus", "against", "match", "plays"]
                ):
                    # Accept the article as it might be about the country's team
                    country_mentioned = True

            if not country_mentioned:
                print(f"  🌍 Filtered: '{title_text[:60]}...' (not about {country})")
                continue

        # Apply category filtering (skip for "general")
        if category and category != "general" and category in category_keywords:
            combined_text = f"{title_text} {description_text} {article}".lower()

            # Count keyword matches
            keyword_matches = sum(
                1 for keyword in category_keywords[category] if keyword in combined_text
            )

            # Check for exclusion keywords (keywords from other categories)
            exclusion_matches = 0
            if category in category_exclusions:
                exclusion_matches = sum(
                    1
                    for keyword in category_exclusions[category]
                    if keyword in combined_text
                )

            # More lenient filtering: require at least 1 keyword OR accept if no strong exclusions
            if keyword_matches == 0 and exclusion_matches >= 3:
                # Only filter if it has NO category keywords AND strong evidence of other category
                print(
                    f"  ⛔ Filtered: '{title_text[:60]}...' (has {exclusion_matches} non-{category} keywords, 0 {category} keywords)"
                )
                continue
            elif keyword_matches == 0:
                print(
                    f"  ⚠️ Weak match: '{title_text[:60]}...' (no direct {category} keywords, but no exclusions)"
                )
                # Accept it anyway - might be tangentially related
            else:
                print(
                    f"  ✓ Matched: '{title_text[:60]}...' ({keyword_matches} {category} keywords)"
                )

        headline = {
            "title": title_text,
            "url": url,
            "source": source_match.group(1).strip() if source_match else None,
            "published": published_match.group(1).strip() if published_match else None,
        }

        headlines.append(headline)

    return headlines


# ---------------------------------------------------------------------
# Flask Route
# ---------------------------------------------------------------------


@app.route("/news", methods=["GET"])
def get_news():
    full_prompt = request.args.get("prompt", "")
    category = request.args.get("category", "general").lower()

    # Add cache control headers to prevent browser caching
    def add_no_cache_headers(response):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    # Extract country name
    country_match = re.search(
        r"about\s+([\w\s]+?)(?:\sin|$)", full_prompt, re.IGNORECASE
    )
    country = country_match.group(1).strip() if country_match else "Global"

    if not country:
        return jsonify({"error": "Could not determine country from prompt."}), 400

    print(f"\n{'='*60}")
    print(f"📰 NEWS REQUEST: {country} | Category: {category.upper()}")
    print(f"{'='*60}")

    try:
        raw_data = asyncio.run(run_direct_tool_call(country, category))
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {repr(e)}")
        return (
            jsonify(
                {
                    "headlines": [
                        {
                            "title": f"API Error: {type(e).__name__}",
                            "source": "System",
                        }
                    ]
                }
            ),
            500,
        )

    headlines = []

    if isinstance(raw_data, dict) and "raw" in raw_data:
        requested_category = raw_data.get("category", category)
        headlines = parse_headlines(raw_data["raw"], requested_category, country)

    print(f"\n📊 Result: {len(headlines)} headlines after filtering")
    print(f"{'='*60}\n")

    if not headlines:
        response = jsonify(
            {
                "headlines": [
                    {
                        "title": f"No {category} news currently available for {country}. Try 'All News' or a different category.",
                        "source": "News API",
                    }
                ]
            }
        )
        return add_no_cache_headers(response)

    # If we have fewer than 3 headlines, add a note
    if len(headlines) < 3 and category != "general":
        headlines.append(
            {
                "title": f"ℹ️ Limited {category} news available. Showing {len(headlines)} article(s).",
                "source": "System",
                "url": None,
                "published": None,
            }
        )

    response = jsonify(
        {"headlines": headlines, "category": category, "country": country}
    )
    return add_no_cache_headers(response)


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
