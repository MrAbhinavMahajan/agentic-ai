import OpenAI from "openai";
import readlineSync from "readline-sync";

// 1. Setup OpenAI Client
const apiKey = "";
const client = new OpenAI({ apiKey });

/**
 * 2. Define Tools (Functions the AI can call)
 * In a real app, these could be API calls or Database queries.
 */
function getWeatherDetails(city = "") {
  const data = {
    CHANDIGARH: "10°C",
    DELHI: "20°C",
    BANGALORE: "30°C",
  };
  return data[city.toUpperCase()] || "15°C (Default)";
}

function getNewsDetails(topic = "") {
  const data = {
    CHANDIGARH: "10°C",
    DELHI: "20°C",
    BANGALORE: "30°C",
  };
  return data[topic.toUpperCase()] || "15°C (Default)";
}

const tools = {
  getWeatherDetails,
  getNewsDetails,
};

/**
 * 3. The ReAct System Prompt
 * This teaches the AI how to think (PLAN) and act (ACTION).
 */
const SYSTEM_PROMPT = `
You are an AI Assistant that follows the ReAct (Reasoning + Acting) pattern.
Your goal is to solve user queries by alternating between thinking and taking actions.

Available Tools:
- getWeatherDetails(city: string): Returns the weather for a given city.

Workflow:
1. PLAN: Think about what you need to do.
2. ACTION: Call a tool if needed.
3. OBSERVATION: Receive the result from the tool.
4. OUTPUT: Provide the final answer to the user.

Format everything as a JSON object.

Example:
User: "What is the weather in Delhi?"
{"type": "plan", "plan": "I need to fetch the weather for Delhi using the getWeatherDetails tool."}
{"type": "action", "function": "getWeatherDetails", "input": "Delhi"}
{"type": "observation", "observation": "20°C"}
{"type": "output", "output": "The weather in Delhi is 20°C."}
`;

/**
 * 4. The Agent Loop
 * This is the "brain" that manages the conversation flow.
 */
async function runAgent() {
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];

  while (true) {
    const query = readlineSync.question("\nYou: ");
    if (query.toLowerCase() === "exit") break;

    messages.push({
      role: "user",
      content: JSON.stringify({ type: "user", user: query }),
    });

    while (true) {
      // Step A: Ask the AI for the next step (Plan or Action)
      const chatCompletion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        response_format: { type: "json_object" },
      });

      const responseText = chatCompletion.choices[0].message.content;
      const response = JSON.parse(responseText);

      // Log the AI's internal thought process
      if (response.type === "plan") {
        console.log(`\n[PLAN]: ${response.plan}`);
      } else if (response.type === "action") {
        console.log(
          `\n[ACTION]: Calling ${response.function} with "${response.input}"`,
        );
      }

      messages.push({ role: "assistant", content: responseText });

      // Step B: Handle the AI's decision
      if (response.type === "output") {
        console.log(`\nAssistant: ${response.output}`);
        break; // End of this user query
      } else if (response.type === "action") {
        // Execute the tool and provide the observation back to the AI
        const toolFn = tools[response.function];
        const result = toolFn(response.input);

        const observation = { type: "observation", observation: result };
        console.log(`[OBSERVATION]: ${result}`);

        // We use "developer" (or "user" in older models) to feed the observation back
        messages.push({ role: "user", content: JSON.stringify(observation) });
      }
    }
  }
}

runAgent().catch(console.error);
