import { onRequestGet } from "./contact.js";

self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.mode === "navigate" && url.origin === self.location.origin &&
      url.pathname === "/phone-contact/" && url.searchParams.has("s")) {
    event.respondWith(onRequestGet({ request: event.request }).then(response =>
      response.ok || response.status === 302 ? response : fetch(event.request)
    ).catch(() => fetch(event.request)));
  }
});
