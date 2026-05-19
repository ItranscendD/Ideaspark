import server from "../dist/server/server.js";

export default async function handler(req, res) {
  try {
    // 1. Convert Node.js req to standard Web Request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const url = `${protocol}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }

    const init = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      } else {
        init.body = req;
        init.duplex = 'half';
      }
    }

    const webRequest = new Request(url, init);

    // 2. Call the server fetch handler
    const response = await server.fetch(webRequest, {}, {});

    // 3. Write standard Web Response back to Node.js res
    res.statusCode = response.status;
    res.statusMessage = response.statusText;
    
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (error) {
    console.error("Vercel Serverless function error:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  }
}
