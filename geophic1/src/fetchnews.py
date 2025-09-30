import os
import json
import asyncio
from flask import Flask, jsonify , request
from dotenv import load_dotenv

# LangChain and MCP imports 
from langchain_core.messages import HumanMessage, ToolMessage
from langchain_groq import ChatGroq
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.prebuilt import create_react_agent
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

server_params = StdioServerParameters(
    command="python",
    args=["-m", "google_news_trends_mcp"],
)

# Flask app setup
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

async def run_agent(prompt_text:str):
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await load_mcp_tools(session)
            print(f"✅ Loaded {len(tools)} tools: {[tool.name for tool in tools]}")
            print("✅ MCP connection initialized successfully.")
            agent_executor = create_react_agent(model=model, tools=tools )
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

@app.route("/news", methods=['GET'])
def get_news():
    prompt_text = request.args.get("prompt")
    if not prompt_text:
        return jsonify({"error": "Missing 'prompt' query parameter"}), 400
    print(f"📨 Received prompt: {prompt_text}")
    print("⏳ Processing prompt...")

    data = asyncio.run(run_agent(prompt_text))
    return jsonify({"headlines": data})



if __name__ == "__main__":
    app.run(debug=True)
