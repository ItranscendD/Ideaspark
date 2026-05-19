import server from "../dist/server/server.js";

export default async function handler(request) {
  try {
    let req = request;
    
    // Normalize relative URLs passed by Vercel Node runtime to prevent ERR_INVALID_URL
    if (request && typeof request.url === "string" && !request.url.startsWith("http")) {
      const protocol = request.headers.get("x-forwarded-proto") || "https";
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost";
      const absoluteUrl = `${protocol}://${host}${request.url}`;
      
      // Re-create the request with a fully qualified URL
      req = new Request(absoluteUrl, request);
    }

    return await server.fetch(req, {}, {});
  } catch (error) {
    console.error("Vercel Serverless function error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
