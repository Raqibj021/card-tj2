import { onRequestGet } from "../_shared/contact.js";

Deno.serve((request) => request.method === "GET"
  ? onRequestGet({ request })
  : new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } }));
