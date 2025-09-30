# import asyncio

# from langchain_mcp_adapters.tools import load_mcp_tools
# from langgraph.prebuilt import create_react_agent
# from mcp import ClientSession, StdioServerParameters
# from mcp.client.stdio import stdio_client
# import getpass
# import os
# from langchain_groq import ChatGroq
# from dotenv import load_dotenv

# load_dotenv()

# model = ChatGroq(
#     model="openai/gpt-oss-120b",
#     temperature=0,
#     max_tokens=None,
#     timeout=None,
#     max_retries=2,
#     api_key=os.getenv("GROQ_API_KEY")
# )


# server_params = StdioServerParameters(
#     command= "python",
#     args= ["-m", "google_news_trends_mcp"]

# )


# async def run_agent():
#     async with stdio_client(server_params) as (read, write):
#         async with ClientSession(read, write) as session:
#             print("---------------------initailise---------------------")
#             # Initialize the connection
#             await session.initialize()
#             print("--------------------initialised---------------------")

#             # Get tools
#             tools = await load_mcp_tools(session)

#             # Create and run the agent
#             agent = create_react_agent(model=model, tools=tools)
#             agent_response = await agent.ainvoke(
#                 {
#                     "messages": "latest news on AI"
#                 }
#             )
#             return agent_response


# # Run the async function
# if __name__ == "__main__":
#     result = asyncio.run(run_agent())
#     print(result)


###################################################################


import asyncio
import os
import pprint

# Import necessary libraries from LangChain, MCP, and Groq
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage , ToolMessage
from langchain_groq import ChatGroq
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.prebuilt import create_react_agent
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# --- 1. Configuration ---
# Load the API key from the .env file
load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")

if not groq_api_key:
    raise ValueError("GROQ_API_KEY not found in .env file. Please add it.")

# Configure the LLM you want to use as the "brain" for the agent
# NOTE: "llama3-8b-8192" is a valid and fast model on Groq.
# The model you had, "openai/gpt-oss-120b", is not a valid Groq model name.
model = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0,
    api_key=groq_api_key
)

# Configure the command to start the MCP server.
# This tells your script to run the 'google_news_trends_mcp' module using Python.
server_params = StdioServerParameters(
    command="python",
    args=["-m", "google_news_trends_mcp"]
)

# --- 2. The Main Agent Logic ---
async def run_agent():
    """
    Connects to the MCP server, loads its tools, creates a LangChain agent,
    and runs it to answer a query.
    """
    print("🚀 Starting the agent...")

    # `stdio_client` starts the server process defined in `server_params`
    # and establishes communication pipes (read/write).
    async with stdio_client(server_params) as (read, write):
        # `ClientSession` manages the structured conversation with the server.
        async with ClientSession(read, write) as session:
            print("🤝 Initializing connection with MCP server...")
            await session.initialize()
            print("✅ Connection initialized successfully.")

            print("🛠️ Loading tools from the MCP server...")
            # `load_mcp_tools` asks the server "what tools do you have?"
            # and automatically converts them into LangChain-compatible tools.
            tools = await load_mcp_tools(session)
            print(f"✅ Loaded {len(tools)} tools: {[tool.name for tool in tools]}")

            

            # `create_react_agent` builds the agent's logic. This is the
            # coordinator that uses the LLM to decide which tool to run.
            agent_executor = create_react_agent(model=model, tools=tools  )
            print("🧠 Agent created. Ready to think!")

            # Define the input for the agent.
            # The format is a list of messages.
            agent_input = {
                "messages": [HumanMessage(content="What are the top 3 latest news headlines about NVIDIA ? ") ]
            }

            print(f"▶️ Invoking agent with query: '{agent_input['messages'][0].content}'")
            
            # `ainvoke` runs the agent's think-act loop asynchronously.
            response = await agent_executor.ainvoke(agent_input  , verbose=True)

            tool_message_content = None
            if "messages" in response:
                for message in response["messages"]:
                    # isinstance should still work if message is proper class instance
                    if isinstance(message, ToolMessage):
                        tool_message_content = message.content
                        break

            if tool_message_content:
                print(tool_message_content)
            else:
                print("No tool message output found in response.")
            
            

            

# --- 3. Execution Block ---
if __name__ == "__main__":
    try:
        # `asyncio.run` starts the event loop and runs our async function.
        result = asyncio.run(run_agent())
        
        print("\n" + "="*50)
        print("🎉 Agent finished its work! Here is the result:")
        print("="*50 + "\n")
        # Use pprint for a cleaner dictionary output
        pprint.pprint(result)

    except Exception as e:
        # This is the important change
        import traceback
        print("\n❌ An error occurred during agent execution!")
        print("="*50)
        # This will print the full, detailed error traceback
        traceback.print_exc()
        print("="*50)



