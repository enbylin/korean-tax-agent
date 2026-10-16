
import http from "node:http";
import https from "node:https";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT || 8080);

const UPSTREAM = new URL(
  "https://mcp.taxdoctorai.com/mcp"
);

const API_TOKEN = process.env.MCP_API_TOKEN;

if (!API_TOKEN) {
  throw new Error("MCP_API_TOKEN is required");
}

const hopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
]);

function isAuthorized(header) {
  if (!header?.startsWith("Bearer ")) return false;

  const received = Buffer.from(header.slice(7));
  const expected = Buffer.from(API_TOKEN);

  return received.length === expected.length &&
    crypto.timingSafeEqual(received, expected);
}

const server = http.createServer((req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (!["/mcp", "/mcp/"].includes(req.url)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  if (!isAuthorized(req.headers.authorization)) {
    res.writeHead(401, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, POST, DELETE" });
    res.end();
    return;
  }

  const headers = {};

  for (const [key, value] of Object.entries(req.headers)) {
    if (
      !hopHeaders.has(key) &&
      key !== "authorization" &&
      value !== undefined
    ) {
      headers[key] = value;
    }
  }

  const upstreamReq = https.request(
    {
      hostname: UPSTREAM.hostname,
      port: 443,
      path: UPSTREAM.pathname,
      method: req.method,
      headers,
    },
    (upstreamRes) => {
      const responseHeaders = {};

      for (const [key, value] of Object.entries(upstreamRes.headers)) {
        if (!hopHeaders.has(key) && value !== undefined) {
          responseHeaders[key] = value;
        }
      }

      res.writeHead(upstreamRes.statusCode || 502, responseHeaders);
      upstreamRes.pipe(res);
    }
  );

  upstreamReq.on("error", (err) => {
    console.error("Upstream error:", err.message);

    if (!res.headersSent) {
      res.writeHead(502);
    }

    res.end();
  });

  req.on("aborted", () => upstreamReq.destroy());
  req.pipe(upstreamReq);
});

server.requestTimeout = 0;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MCP Gateway listening on ${PORT}`);
});
