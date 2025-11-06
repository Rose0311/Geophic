import os
import json
import asyncio
from flask import Flask, jsonify , request
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

model = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0,
    api_key=groq_api_key,
)

# server_params = StdioServerParameters(
#     command="python",
#     args=["-m", "google_news_trends_mcp"],
# )

server_params = StdioServerParameters(
    command="docker",
    args=["run", "--rm", "-i", "-e", f"NEWS_API_KEY={os.getenv('NEWS_API_KEY')}", "mcp/news-api"]
)

# Flask app setup
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

async def run_agent(prompt_text:str):
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await load_mcp_tools(session)
            print(f"✅ Loaded {len(tools)} tools: {[tool.name for tool in tools]}")
            print("✅ MCP connection initialized successfully.")
            agent_executor = create_agent(model=model, tools=tools )
            agent_input = {
                "messages": [HumanMessage(content=prompt_text)]
            }
            print("--------------model intialised-----------------")
            try:
                response = await agent_executor.ainvoke(agent_input)
                print("Received response")
            except Exception as e:
                print("Error during ainvoke:", repr(e))
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
                    return json.loads(tool_message_content)
                except:
                    return {"raw": tool_message_content}
            else:
                return []

def parse_headlines(raw_text):
    headlines = []
    articles = raw_text.split('---')
    
    for article in articles:
        if 'Title:' not in article:
            continue
            
        title_match = re.search(r'Title:\s*(.+?)(?:\n|$)', article)
        url_match = re.search(r'URL:\s*(.+?)(?:\n|$)', article)
        source_match = re.search(r'Source:\s*(.+?)(?:\n|$)', article)
        author_match = re.search(r'Author:\s*(.+?)(?:\n|$)', article)
        published_match = re.search(r'Published:\s*(.+?)(?:\n|$)', article)
        desc_match = re.search(r'Description:\s*(.+?)(?:\n|$)', article)
        
        headline = {
            'title': title_match.group(1).strip() if title_match else 'No title',
            'url': url_match.group(1).strip() if url_match else None,
            'source': source_match.group(1).strip() if source_match else None,
            'author': author_match.group(1).strip() if author_match and author_match.group(1).strip() != 'None' else None,
            'published': published_match.group(1).strip() if published_match else None,
            'description': desc_match.group(1).strip() if desc_match else None
        }
        headlines.append(headline)
    
    return headlines

@app.route("/news", methods=['GET'])
def get_news():
    prompt_text = request.args.get("prompt")
    if not prompt_text:
        return jsonify({"error": "Missing 'prompt' query parameter"}), 400
    print(f"📨 Received prompt: {prompt_text}")
    print("⏳ Processing prompt...")

    raw_data = asyncio.run(run_agent(prompt_text))
    print('----------------------------print data------------------')
    print(raw_data)

    if isinstance(raw_data, dict) and 'raw' in raw_data:
        headlines = parse_headlines(raw_data['raw'])
    else:
        headlines = []
    
    return jsonify({"headlines": headlines})



if __name__ == "__main__":
    app.run(debug=True)
