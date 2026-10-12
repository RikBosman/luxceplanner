// Minimale lokale vervanger voor de Supabase API-gateway (Kong) + een SMTP-opvang voor e-mails.
// Alleen voor lokale end-to-end-tests. Routes: /auth/v1 → Auth, /rest/v1 → PostgREST, /_mail → opgevangen e-mails.
import http from "node:http";
import net from "node:net";

const GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? 54321);
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 54325);
const AUTH = { host: "127.0.0.1", port: Number(process.env.AUTH_PORT ?? 54329) };
const REST = { host: "127.0.0.1", port: Number(process.env.REST_PORT ?? 54330) };
const mails = [];

http
  .createServer((req, res) => {
    if (req.url.startsWith("/_mail")) {
      if (req.method === "DELETE") mails.length = 0;
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(mails));
    }
    let target, path;
    if (req.url.startsWith("/auth/v1")) [target, path] = [AUTH, req.url.slice("/auth/v1".length) || "/"];
    else if (req.url.startsWith("/rest/v1")) [target, path] = [REST, req.url.slice("/rest/v1".length) || "/"];
    else {
      res.writeHead(404);
      return res.end("not found");
    }
    const headers = { ...req.headers };
    // Zoals Kong: zonder Authorization-header de apikey als bearer-token gebruiken.
    if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
    const upstream = http.request({ ...target, path, method: req.method, headers }, (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    });
    upstream.on("error", (e) => {
      res.writeHead(502);
      res.end(String(e));
    });
    req.pipe(upstream);
  })
  .listen(GATEWAY_PORT, "127.0.0.1", () => console.log(`gateway op :${GATEWAY_PORT}`));

// Uiterst eenvoudige SMTP-server: accepteert alles en bewaart de berichten in het geheugen.
net
  .createServer((socket) => {
    let buffer = "";
    let inData = false;
    let current = { to: [], data: "" };
    const send = (line) => socket.write(line + "\r\n");
    send("220 localhost ESMTP test");
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let idx;
      while ((idx = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (inData) {
          if (line === ".") {
            inData = false;
            mails.push({ to: current.to, raw: current.data, receivedAt: new Date().toISOString() });
            current = { to: [], data: "" };
            send("250 OK");
          } else current.data += (line.startsWith("..") ? line.slice(1) : line) + "\n";
          continue;
        }
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === "EHLO" || cmd === "HELO") send("250 localhost");
        else if (cmd === "MAIL") send("250 OK");
        else if (cmd === "RCPT") {
          current.to.push(line.replace(/^RCPT TO:\s*/i, "").replace(/[<>]/g, ""));
          send("250 OK");
        } else if (cmd === "DATA") {
          inData = true;
          send("354 End data with <CR><LF>.<CR><LF>");
        } else if (cmd === "QUIT") {
          send("221 Bye");
          socket.end();
        } else send("250 OK");
      }
    });
  })
  .listen(SMTP_PORT, "127.0.0.1", () => console.log(`smtp op :${SMTP_PORT}`));
