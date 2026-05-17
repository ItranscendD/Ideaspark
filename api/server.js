import server from "../dist/server/server.js";

export const config = {
  runtime: "edge",
};

export default async function handler(request) {
  try {
    return await server.fetch(request, {}, {});
  } catch (error) {
    console.error("Vercel Edge function error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
