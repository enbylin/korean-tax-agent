import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { server } from "./dist/index.js";

const app = express();
const PORT = process.env.PORT || 8080;

let transport = null;

app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("SSE connection not established.");
  }
});

app.listen(PORT, () => {
  console.log(`Tax MCP Server listening on port ${PORT}`);
});
