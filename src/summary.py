import os
import json
import asyncio
from flask import Flask, jsonify, request
from dotenv import load_dotenv
from flask_cors import CORS

# LangChain and MCP imports
from langchain_core.messages import HumanMessage
from langchain_groq import ChatGroq
from langchain_mcp_adapters.tools import load_mcp_tools
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# --- Configuration ---
load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    print("FATAL ERROR: GROQ_API_KEY not found in .env file.")

model = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0.3,
    api_key=groq_api_key,
)

# Playwright MCP Server Configuration
playwright_server_params = StdioServerParameters(
      command= "npx",
      args= ["-y", "firecrawl-mcp"],
      env= {
        "FIRECRAWL_API_KEY": os.getenv("FIRECRAWL_API_KEY")
      }
)



# Flask app setup
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# ---------------------------------------------------------------------
# ⚡ PLAYWRIGHT TOOL EXECUTION
# ---------------------------------------------------------------------


async def fetch_and_summarize_url(url: str):
    """
    Uses Playwright MCP to navigate to URL, extract content, and summarize it.
    """
    async with stdio_client(playwright_server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await load_mcp_tools(session)

            print(f"Available tools: {[t.name for t in tools]}")

            # Find the playwright_navigate tool (adjust name based on actual tool)
            navigate_tool = next(
                (t for t in tools if "scrape" in t.name.lower() or "crawl" in t.name.lower()), None
            )

            if not navigate_tool:
                print("Error: Navigation tool not found.")
                return {"error": "firecrwal navigation tool not available."}

            print(f"Using tool: {navigate_tool.name}")

            # 1. Navigate to the URL and extract content
            try:
                # Navigate to URL - adjust parameters based on actual tool signature
                tool_result = await navigate_tool.ainvoke({"url": url})
                
                page_content = str(tool_result)
                print(f"Extracted content length: {len(page_content)} characters")

                # 2. Summarize the content using LLM
                if not page_content or len(page_content) < 50:
                    return {
                        "error": "Unable to extract sufficient content from the URL.",
                        "raw_content": page_content,
                    }

                summary = await summarize_content(page_content, url)

                return {
                    "url": url,
                    "summary": summary,
                    "content_length": len(page_content),
                    "success": True,
                }

            except Exception as e:
                print(f"Error during Playwright tool invocation: {repr(e)}")
                return {
                    "error": f"Failed to fetch URL: {str(e)}",
                    "url": url,
                    "success": False,
                }


async def summarize_content(content: str, url: str):
    """
    Uses the LLM to create a concise summary of the page content.
    """
    # Truncate content if too long (to stay within token limits)
    max_content_length = 8000
    if len(content) > max_content_length:
        content = content[:max_content_length] + "... [truncated]"

    prompt = f"""Please provide a concise summary of the following web page content from {url}.

Focus on:
- Main topic and key points
- Important facts or information

Content:
{content}

Provide a clear, well-structured short summary in bullet points.DO NOT repeat the title or start with "Key take-aways" - just provide the summary content directly"""

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        return response.content
    except Exception as e:
        print(f"Error during summarization: {repr(e)}")
        return f"Error generating summary: {str(e)}"


# ---------------------------------------------------------------------
# Flask Routes
# ---------------------------------------------------------------------


@app.route("/summarize", methods=["POST"])
def summarize_url():
    """
    Endpoint to summarize a URL.
    Expects JSON: {"url": "https://example.com"}
    """
    data = request.get_json()

    if not data or "url" not in data:
        return jsonify({"error": "URL is required in request body."}), 400

    url = data["url"]

    # Validate URL format
    if not url.startswith(("http://", "https://")):
        return jsonify({"error": "Invalid URL format. Must start with http:// or https://"}), 400

    print(f"\n--- Summarizing URL: {url} ---")

    try:
        result = asyncio.run(fetch_and_summarize_url(url))

        if "error" in result:
            return jsonify(result), 500

        return jsonify(result)

    except Exception as e:
        print(f"CRITICAL ERROR in URL summarization: {repr(e)}")
        return (
            jsonify(
                {
                    "error": f"Server error: {type(e).__name__}",
                    "message": str(e),
                    "success": False,
                }
            ),
            500,
        )


@app.route("/summarize", methods=["GET"])
def summarize_url_get():
    """
    Alternative GET endpoint: /summarize?url=https://example.com
    """
    url = request.args.get("url")

    if not url:
        return jsonify({"error": "URL parameter is required."}), 400

    # Validate URL format
    if not url.startswith(("http://", "https://")):
        return jsonify({"error": "Invalid URL format. Must start with http:// or https://"}), 400

    print(f"\n--- Summarizing URL: {url} ---")

    try:
        result = asyncio.run(fetch_and_summarize_url(url))

        if "error" in result:
            return jsonify(result), 500

        return jsonify(result)

    except Exception as e:
        print(f"CRITICAL ERROR in URL summarization: {repr(e)}")
        return (
            jsonify(
                {
                    "error": f"Server error: {type(e).__name__}",
                    "message": str(e),
                    "success": False,
                }
            ),
            500,
        )


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "URL Summarizer"})


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5001)