self.addEventListener("push", function (event) {
  console.log("🔥 PUSH RECEIVED");

  let data = { title: "TEST", body: "Push works" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn("⚠️ Not JSON, fallback to text");

      data = {
        title: "TEST",
        body: event.data.text(),
      };
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/vercel.svg",
      badge: "/vercel.svg",
      tag: "test",
      requireInteraction: true,
    })
  );
});


if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7144475a'], (function (workbox) { 'use strict';

  importScripts("/worker.js");
  self.skipWaiting();
  workbox.clientsClaim();
  workbox.registerRoute("/", new workbox.NetworkFirst({
    "cacheName": "start-url",
    plugins: [{
      cacheWillUpdate: function (param) {
        var e = param.response;
        return _async_to_generator(function () {
          return _ts_generator(this, function (_state) {
            return [2, e && "opaqueredirect" === e.type ? new Response(e.body, {
              status: 200,
              statusText: "OK",
              headers: e.headers
            }) : e];
          });
        })();
      }
    }]
  }), 'GET');
  workbox.registerRoute(/.*/i, new workbox.NetworkOnly({
    "cacheName": "dev",
    plugins: []
  }), 'GET');

}));
