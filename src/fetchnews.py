import os
import json
import asyncio
from flask import Flask, jsonify, request
from dotenv import load_dotenv
import re

# LangChain and MCP imports
from langchain_core.messages import HumanMessage, ToolMessage
from langchain_groq import ChatGroq
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain.agents import create_agent
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from flask_cors import CORS

load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    raise ValueError("GROQ_API_KEY not found in .env file. Please add it.")

# Use a standard, fast Groq model for reliability if rate limits are an issue
# openai/gpt-oss-120b is a custom model, stick to something standard like llama3-8b-8192 if available
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
# ASYNC AGENT RUNNER (No changes needed here unless instructed)
# ---------------------------------------------------------------------
async def run_agent(prompt_text: str):
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await load_mcp_tools(session)
            print(f"✅ Loaded {len(tools)} tools: {[tool.name for tool in tools]}")
            print("✅ MCP connection initialized successfully.")
            agent_executor = create_agent(model=model, tools=tools)
            agent_input = {"messages": [HumanMessage(content=prompt_text)]}
            print("--------------model intialised-----------------")
            try:
                response = await agent_executor.ainvoke(agent_input)
                print("Received response")
            except Exception as e:
                print("Error during ainvoke:", repr(e))
                # Propagate the error so Flask returns 500
                raise
            print("---------------------response received----------------------")
            tool_message_content = None
            if "messages" in response:
                for message in response["messages"]:
                    if isinstance(message, ToolMessage):
                        tool_message_content = message.content
                        print(tool_message_content)
                        break
            if tool_message_content:
                try:
                    # Attempt to load as JSON first
                    return json.loads(tool_message_content)
                except:
                    # If JSON fails, return as raw string
                    return {"raw": tool_message_content}
            else:
                return []


# ---------------------------------------------------------------------


# ⚡ UPDATED: Make parsing more robust against common failure messages
def parse_headlines(raw_text):
    # Handle explicit 'No headlines' message
    if (
        raw_text is None
        or "no headlines found" in raw_text.lower()
        or "no articles found" in raw_text.lower()
    ):
        return []

    headlines = []
    articles = raw_text.split("---")

    for article in articles:
        # Check for a complete set of markers to avoid adding garbage text
        if "Title:" not in article:
            continue

        # Use re.IGNORECASE for more flexible matching
        title_match = re.search(r"Title:\s*(.+?)(?:\n|$)", article, re.IGNORECASE)
        url_match = re.search(r"URL:\s*(.+?)(?:\n|$)", article, re.IGNORECASE)
        source_match = re.search(r"Source:\s*(.+?)(?:\n|$)", article, re.IGNORECASE)
        author_match = re.search(r"Author:\s*(.+?)(?:\n|$)", article, re.IGNORECASE)
        published_match = re.search(
            r"Published:\s*(.+?)(?:\n|$)", article, re.IGNORECASE
        )
        desc_match = re.search(r"Description:\s*(.+?)(?:\n|$)", article, re.IGNORECASE)

        headline = {
            "title": title_match.group(1).strip() if title_match else "No title",
            "url": url_match.group(1).strip() if url_match else None,
            "source": source_match.group(1).strip() if source_match else None,
            "author": (
                author_match.group(1).strip()
                if author_match and author_match.group(1).strip() not in ("None", "N/A")
                else None
            ),
            "published": published_match.group(1).strip() if published_match else None,
            "description": desc_match.group(1).strip() if desc_match else None,
        }
        headlines.append(headline)

    return headlines


@app.route("/news", methods=["GET"])
def get_news():
    prompt_base = request.args.get("prompt")
    category = request.args.get("category", "general")

    if not prompt_base:
        return jsonify({"error": "Missing 'prompt' query parameter"}), 400

    # ⚡ MODIFIED PROMPT: Ensure it clearly asks for news structured for parsing.
    if category and category != "general":
        full_prompt = f"Using the 'search-news' tool, provide the 4 latest news headlines about {prompt_base} in the category of {category}. Format each headline as Title:..., URL:..., Source:..., Published:... delimited by '---'."
    else:
        full_prompt = f"Using the 'search-news' tool, provide the 4 latest news headlines about {prompt_base}. Format each headline as Title:..., URL:..., Source:..., Published:... delimited by '---'."

    print(f"🧠 Sending full prompt to agent: {full_prompt}")

    raw_data = asyncio.run(run_agent(full_prompt))

    headlines = []

    if isinstance(raw_data, dict) and "raw" in raw_data:
        # Pass the raw string to the updated parser
        headlines = parse_headlines(raw_data["raw"])
    elif isinstance(raw_data, list):
        # Handle case where agent returns an empty list
        headlines = []
    else:
        # Fallback for unexpected structured data (e.g., if agent returns a non-headline JSON)
        print("⚠️ Agent returned unexpected structured data.")
        headlines = []

    # If the parser finds headlines, return them. Otherwise, return an empty list.
    return jsonify({"headlines": headlines})


if __name__ == "__main__":
    app.run(debug=True)

