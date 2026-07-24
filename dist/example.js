const expressionCache = /* @__PURE__ */ new Map();
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const compileExpression = (expression) => {
  const cached = expressionCache.get(expression);
  if (cached) {
    return cached;
  }
  const transformed = expression.replace(/\bthis\b/g, "__item");
  const fn = new Function("scope", `with (scope) { return (${transformed}); }`);
  expressionCache.set(expression, fn);
  return fn;
};
const evaluate = (expression, scope) => {
  try {
    return compileExpression(expression)(scope);
  } catch {
    return "";
  }
};
const parseNodes = (template2, from = 0, stopAt) => {
  const nodes = [];
  let index = from;
  while (index < template2.length) {
    const start = template2.indexOf("{{", index);
    if (start === -1) {
      nodes.push({ type: "text", value: template2.slice(index) });
      return { nodes, index: template2.length };
    }
    if (start > index) {
      nodes.push({ type: "text", value: template2.slice(index, start) });
    }
    const close = template2.indexOf("}}", start + 2);
    if (close === -1) {
      nodes.push({ type: "text", value: template2.slice(start) });
      return { nodes, index: template2.length };
    }
    const token = template2.slice(start + 2, close).trim();
    index = close + 2;
    if (token === "/if" || token === "/each") {
      if (stopAt === token) {
        return { nodes, index };
      }
      nodes.push({ type: "text", value: `{{${token}}}` });
      continue;
    }
    if (token.startsWith("#if ")) {
      const child = parseNodes(template2, index, "/if");
      nodes.push({
        type: "if",
        condition: token.slice(4).trim(),
        children: child.nodes
      });
      index = child.index;
      continue;
    }
    if (token.startsWith("#each ")) {
      const child = parseNodes(template2, index, "/each");
      nodes.push({
        type: "each",
        source: token.slice(6).trim(),
        children: child.nodes
      });
      index = child.index;
      continue;
    }
    nodes.push({ type: "expr", value: token });
  }
  return { nodes, index };
};
const renderNodes = (nodes, scope) => {
  let output = "";
  for (const node of nodes) {
    if (node.type === "text") {
      output += node.value;
      continue;
    }
    if (node.type === "expr") {
      output += escapeHtml(evaluate(node.value, scope));
      continue;
    }
    if (node.type === "if") {
      if (Boolean(evaluate(node.condition, scope))) {
        output += renderNodes(node.children, scope);
      }
      continue;
    }
    const items = evaluate(node.source, scope);
    if (!Array.isArray(items)) {
      continue;
    }
    for (const item of items) {
      const childScope = Object.create(scope);
      childScope.__item = item;
      output += renderNodes(node.children, childScope);
    }
  }
  return output;
};
const createTemplateRenderer = (template2) => {
  const parsed = parseNodes(template2).nodes;
  return (scope) => renderNodes(parsed, scope);
};
typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};
function transformCallback(callback, once = false) {
  return window.__TAURI_INTERNALS__.transformCallback(callback, once);
}
async function invoke(cmd, args = {}, options) {
  return window.__TAURI_INTERNALS__.invoke(cmd, args, options);
}
function convertFileSrc(filePath, protocol = "asset") {
  return window.__TAURI_INTERNALS__.convertFileSrc(filePath, protocol);
}
var TauriEvent;
(function(TauriEvent2) {
  TauriEvent2["WINDOW_RESIZED"] = "tauri://resize";
  TauriEvent2["WINDOW_MOVED"] = "tauri://move";
  TauriEvent2["WINDOW_CLOSE_REQUESTED"] = "tauri://close-requested";
  TauriEvent2["WINDOW_DESTROYED"] = "tauri://destroyed";
  TauriEvent2["WINDOW_FOCUS"] = "tauri://focus";
  TauriEvent2["WINDOW_BLUR"] = "tauri://blur";
  TauriEvent2["WINDOW_SCALE_FACTOR_CHANGED"] = "tauri://scale-change";
  TauriEvent2["WINDOW_THEME_CHANGED"] = "tauri://theme-changed";
  TauriEvent2["WINDOW_CREATED"] = "tauri://window-created";
  TauriEvent2["WEBVIEW_CREATED"] = "tauri://webview-created";
  TauriEvent2["DRAG_ENTER"] = "tauri://drag-enter";
  TauriEvent2["DRAG_OVER"] = "tauri://drag-over";
  TauriEvent2["DRAG_DROP"] = "tauri://drag-drop";
  TauriEvent2["DRAG_LEAVE"] = "tauri://drag-leave";
})(TauriEvent || (TauriEvent = {}));
async function _unlisten(event, eventId) {
  window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(event, eventId);
  await invoke("plugin:event|unlisten", {
    event,
    eventId
  });
}
async function listen(event, handler, options) {
  var _a;
  const target = (_a = void 0) !== null && _a !== void 0 ? _a : { kind: "Any" };
  return invoke("plugin:event|listen", {
    event,
    target,
    handler: transformCallback(handler)
  }).then((eventId) => {
    return async () => _unlisten(event, eventId);
  });
}
const OPEN_EVENT = "pack-tcp-socket-open";
const DATA_EVENT = "pack-tcp-socket-data";
const CLOSE_EVENT = "pack-tcp-socket-close";
const CONNECT_TIMEOUT_MS = 5e3;
const toBase64 = (bytes) => {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
};
const fromBase64 = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};
const normalizeBinary = (value) => {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  return Uint8Array.from(value);
};
const createSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tcp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
class RuntimeTcpSocket {
  constructor(options, hasEventAccess) {
    this.hasEventAccess = hasEventAccess;
    this.isConnected = false;
    this.connecting = null;
    this.tauriListenersReady = null;
    this.tauriUnlisteners = [];
    this.listeners = {
      open: /* @__PURE__ */ new Set(),
      data: /* @__PURE__ */ new Set(),
      close: /* @__PURE__ */ new Set(),
      error: /* @__PURE__ */ new Set()
    };
    this.host = String(options.host ?? "").trim();
    this.port = Number(options.port);
    this.sessionId = createSessionId();
  }
  get connected() {
    return this.isConnected;
  }
  async connect() {
    if (!this.hasEventAccess) {
      throw new Error("TCP socket access requires the Allow event access permission.");
    }
    if (this.isConnected) {
      return;
    }
    if (this.connecting) {
      return this.connecting;
    }
    if (!this.host || !Number.isInteger(this.port) || this.port < 1 || this.port > 65535) {
      throw new Error("A valid TCP socket host and port are required.");
    }
    this.connecting = this.connectInternal();
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }
  async send(data) {
    if (!this.isConnected) {
      throw new Error("TCP socket is not connected.");
    }
    await invoke("pack_tcp_socket_write", {
      sessionId: this.sessionId,
      dataBase64: toBase64(normalizeBinary(data))
    });
  }
  async write(data) {
    await this.send(data);
  }
  async close() {
    try {
      await invoke("pack_tcp_socket_disconnect", { sessionId: this.sessionId });
    } finally {
      this.isConnected = false;
      this.teardownTauriListeners();
    }
  }
  on(eventName, handler) {
    this.listeners[eventName].add(handler);
    return () => this.listeners[eventName].delete(handler);
  }
  async connectInternal() {
    await this.ensureTauriListeners();
    await new Promise(async (resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`TCP socket connection timed out for ${this.host}:${this.port}`));
      }, CONNECT_TIMEOUT_MS);
      const offOpen = this.on("open", () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      });
      const offClose = this.on("close", (payload) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(payload.error ?? `TCP socket closed before opening.`));
      });
      const cleanup = () => {
        clearTimeout(timeoutId);
        offOpen();
        offClose();
      };
      try {
        await invoke("pack_tcp_socket_connect", {
          sessionId: this.sessionId,
          host: this.host,
          port: this.port,
          allowEventAccess: this.hasEventAccess
        });
      } catch (error) {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      }
    });
  }
  async ensureTauriListeners() {
    if (this.tauriListenersReady) {
      return this.tauriListenersReady;
    }
    this.tauriListenersReady = (async () => {
      this.tauriUnlisteners = [
        await listen(OPEN_EVENT, (event) => {
          if (event.payload.sessionId !== this.sessionId) return;
          this.isConnected = true;
          this.emit("open", {
            host: this.host,
            port: this.port
          });
        }),
        await listen(DATA_EVENT, (event) => {
          if (event.payload.sessionId !== this.sessionId) return;
          try {
            this.emit("data", fromBase64(event.payload.dataBase64));
          } catch (error) {
            this.emit("error", {
              host: this.host,
              port: this.port,
              error: error instanceof Error ? error.message : "Invalid TCP socket data."
            });
          }
        }),
        await listen(CLOSE_EVENT, (event) => {
          if (event.payload.sessionId !== this.sessionId) return;
          this.isConnected = false;
          if (event.payload.error) {
            this.emit("error", {
              host: this.host,
              port: this.port,
              error: event.payload.error
            });
          }
          this.emit("close", {
            host: this.host,
            port: this.port,
            error: event.payload.error
          });
        })
      ];
    })();
    return this.tauriListenersReady;
  }
  teardownTauriListeners() {
    for (const unlisten of this.tauriUnlisteners) {
      try {
        unlisten();
      } catch {
      }
    }
    this.tauriUnlisteners = [];
    this.tauriListenersReady = null;
  }
  emit(eventName, payload) {
    for (const listener of this.listeners[eventName]) {
      listener(payload);
    }
  }
}
const isSignal = (value) => {
  if (typeof value !== "function") {
    return false;
  }
  const candidate = value;
  return candidate._isSignal === true && typeof candidate.set === "function" && typeof candidate.subscribe === "function";
};
const signal = (initialValue) => {
  let current = initialValue;
  const subscribers = /* @__PURE__ */ new Set();
  const read = (() => current);
  read._isSignal = true;
  read.set = (value) => {
    if (Object.is(current, value)) {
      return;
    }
    current = value;
    for (const subscriber of subscribers) {
      subscriber(current);
    }
  };
  read.update = (updater) => {
    read.set(updater(current));
  };
  read.subscribe = (subscriber) => {
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  };
  return read;
};
const focusWidgetView = (configuredWidgetId, requestId = "") => invoke("controller_widget_focus_view", {
  configuredWidgetId,
  requestId
});
const isWidgetViewFocused = async (configuredWidgetId, focusRequestId) => {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let unlisten = null;
  let resolveResponse = null;
  const response = new Promise((resolve) => {
    resolveResponse = resolve;
  });
  try {
    unlisten = await listen(
      "displayduck-widget-focus-state-response",
      (event) => {
        if (event.payload.requestId !== requestId || event.payload.configuredWidgetId !== configuredWidgetId) {
          return;
        }
        resolveResponse?.(event.payload.focused === true);
      }
    );
    await invoke("controller_widget_get_focus_state", {
      configuredWidgetId,
      focusRequestId,
      requestId
    });
    return await Promise.race([
      response,
      new Promise((resolve) => setTimeout(() => resolve(false), 1e3))
    ]);
  } finally {
    unlisten?.();
  }
};
const setWidgetFocusRequirement = (configuredWidgetId, required, requestId) => invoke("controller_widget_set_focus_requirement", {
  configuredWidgetId,
  required,
  requestId
});
const bindSignals = (source, onChange) => {
  const unsubscribers = [];
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (isSignal(value)) {
      unsubscribers.push(value.subscribe(() => onChange()));
    }
  }
  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  };
};
const createScope = (instance, payload) => {
  return new Proxy(
    { payload },
    {
      get(target, property) {
        if (typeof property !== "string") {
          return void 0;
        }
        if (property in target) {
          return target[property];
        }
        const value = instance[property];
        if (typeof value === "function") {
          return value.bind(instance);
        }
        return value;
      },
      has(target, property) {
        if (typeof property !== "string") {
          return false;
        }
        return property in target || property in instance;
      }
    }
  );
};
const RELATIVE_URL_ATTRIBUTES = ["src", "href", "poster"];
const PACK_INSTALL_PATH_PLACEHOLDER = "{{pack-install-path}}/";
const ASSETS_PLACEHOLDER = "{{ASSETS}}";
const isExternalAssetUrl = (value) => {
  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed.startsWith("data:") || trimmed.startsWith("blob:") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("file:") || trimmed.startsWith("asset:") || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:") || trimmed.startsWith("javascript:") || trimmed.startsWith("//") || trimmed.startsWith("/") || trimmed.startsWith("#");
};
const extractWidgetRelativePath = (value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!isExternalAssetUrl(trimmed)) {
    return trimmed.replace(/^\.\/+/, "").replace(/^\/+/, "");
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      if (url.origin === window.location.origin) {
        return `${url.pathname}${url.search}${url.hash}`.replace(/^\/+/, "");
      }
    } catch {
      return null;
    }
  }
  return null;
};
const normalizeJoinedAssetPath = (widgetDirectory, relativePath) => {
  const normalizedBase = widgetDirectory.replaceAll("\\", "/").replace(/\/+$/, "");
  const combined = `${normalizedBase}/${relativePath.trim()}`;
  const segments = combined.split("/");
  const resolved = [];
  for (const segment of segments) {
    if (!segment || segment === ".") {
      if (resolved.length === 0 && combined.startsWith("/")) {
        resolved.push("");
      }
      continue;
    }
    if (segment === "..") {
      if (resolved.length > 1 || resolved.length === 1 && resolved[0] !== "") {
        resolved.pop();
      }
      continue;
    }
    resolved.push(segment);
  }
  return resolved.join("/") || normalizedBase;
};
const resolveAssetUrl = (widgetDirectory, value) => {
  const relativePath = extractWidgetRelativePath(value);
  if (!widgetDirectory || !relativePath) {
    return value;
  }
  try {
    return convertFileSrc(normalizeJoinedAssetPath(widgetDirectory, relativePath));
  } catch {
    return value;
  }
};
const resolveAssetsBaseUrl = (widgetDirectory) => {
  const normalizedDirectory = widgetDirectory.trim().replaceAll("\\", "/").replace(/\/+$/, "");
  if (!normalizedDirectory) {
    return "";
  }
  try {
    return convertFileSrc(normalizedDirectory);
  } catch {
    return normalizedDirectory;
  }
};
const rewriteSrcset = (value, widgetDirectory) => {
  return value.split(",").map((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) {
      return trimmed;
    }
    const [url, descriptor] = trimmed.split(/\s+/, 2);
    const nextUrl = resolveAssetUrl(widgetDirectory, url);
    return descriptor ? `${nextUrl} ${descriptor}` : nextUrl;
  }).join(", ");
};
const rewriteInlineStyleUrls = (value, widgetDirectory) => {
  return value.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote, urlValue) => {
    const nextUrl = resolveAssetUrl(widgetDirectory, urlValue);
    if (nextUrl === urlValue) {
      return full;
    }
    return `url("${nextUrl}")`;
  });
};
const rewriteElementAssetUrls = (element, widgetDirectory) => {
  for (const attribute of RELATIVE_URL_ATTRIBUTES) {
    const currentValue = element.getAttribute(attribute);
    if (!currentValue) {
      continue;
    }
    const nextValue = resolveAssetUrl(widgetDirectory, currentValue);
    if (nextValue !== currentValue) {
      element.setAttribute(attribute, nextValue);
    }
  }
  const currentSrcset = element.getAttribute("srcset");
  if (currentSrcset) {
    const nextSrcset = rewriteSrcset(currentSrcset, widgetDirectory);
    if (nextSrcset !== currentSrcset) {
      element.setAttribute("srcset", nextSrcset);
    }
  }
  const currentStyle = element.getAttribute("style");
  if (currentStyle) {
    const nextStyle = rewriteInlineStyleUrls(currentStyle, widgetDirectory);
    if (nextStyle !== currentStyle) {
      element.setAttribute("style", nextStyle);
    }
  }
};
const rewriteTreeAssetUrls = (root, widgetDirectory) => {
  if (!widgetDirectory) {
    return;
  }
  if (root instanceof Element) {
    rewriteElementAssetUrls(root, widgetDirectory);
  }
  for (const element of Array.from(root.querySelectorAll("*"))) {
    rewriteElementAssetUrls(element, widgetDirectory);
  }
};
const rewriteInstallPathPlaceholders = (input, widgetDirectory) => {
  if (!widgetDirectory) {
    return input;
  }
  let output = input;
  const assetsBaseUrl = resolveAssetsBaseUrl(widgetDirectory);
  if (assetsBaseUrl && output.includes(ASSETS_PLACEHOLDER)) {
    output = output.replaceAll(ASSETS_PLACEHOLDER, assetsBaseUrl);
  }
  if (!output.includes(PACK_INSTALL_PATH_PLACEHOLDER)) {
    return output;
  }
  return output.replace(/\{\{pack-install-path\}\}\/([^"')\s]+)/g, (full, relativePath) => {
    return resolveAssetUrl(widgetDirectory, relativePath);
  });
};
const extractFontFaceRules = (styles2) => {
  const fontFacePattern = /@font-face\s*\{[^{}]*\}/gi;
  const fontStyles = styles2.match(fontFacePattern)?.join("\n") ?? "";
  return {
    scopedStyles: fontStyles ? styles2.replace(fontFacePattern, "") : styles2,
    fontStyles
  };
};
const createWidgetClass = (WidgetImpl, options) => {
  return class RuntimeWidget {
    constructor({
      mount,
      payload,
      setLoading
    }) {
      this.cleanups = [];
      this.hasRendered = false;
      this.renderScheduled = false;
      this.destroyed = false;
      this.globalFontStyle = null;
      this.focusRequestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      this.widgetDirectory = "";
      this.mount = mount;
      this.payload = payload ?? {};
      this.setLoading = typeof setLoading === "function" ? setLoading : (() => {
      });
      this.assetObserver = new MutationObserver((mutations) => {
        if (!this.widgetDirectory) {
          return;
        }
        for (const mutation of mutations) {
          if (mutation.type === "attributes" && mutation.target instanceof Element) {
            rewriteElementAssetUrls(mutation.target, this.widgetDirectory);
            continue;
          }
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof Element) {
              rewriteTreeAssetUrls(node, this.widgetDirectory);
            }
          }
        }
      });
      this.logic = new WidgetImpl({
        mount,
        payload: this.payload,
        setLoading: (loading) => this.setLoading(Boolean(loading)),
        focusWidgetView: () => focusWidgetView(
          String(this.payload?.configuredWidgetId ?? "").trim(),
          this.focusRequestId
        ),
        isWidgetViewFocused: () => isWidgetViewFocused(
          String(this.payload?.configuredWidgetId ?? "").trim(),
          this.focusRequestId
        ),
        setRequireFocus: (required) => setWidgetFocusRequirement(
          String(this.payload?.configuredWidgetId ?? "").trim(),
          Boolean(required),
          this.focusRequestId
        ),
        createTcpSocket: (options2) => new RuntimeTcpSocket(
          options2,
          this.hasEventAccessPermission()
        ),
        on: (eventName, selector, handler) => this.on(eventName, selector, handler)
      });
      this.cleanupSignalSubscriptions = bindSignals(this.logic, () => this.scheduleRender());
      this.assetObserver.observe(this.mount, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["src", "href", "poster", "srcset", "style"]
      });
    }
    onInit() {
      this.render();
      this.logic.onInit?.();
    }
    onUpdate(payload) {
      this.payload = payload ?? {};
      this.logic.onUpdate?.(this.payload);
      this.render();
    }
    onDestroy() {
      this.destroyed = true;
      this.renderScheduled = false;
      this.globalFontStyle?.remove();
      this.globalFontStyle = null;
      this.cleanupSignalSubscriptions();
      while (this.cleanups.length > 0) {
        const cleanup = this.cleanups.pop();
        cleanup?.();
      }
      this.assetObserver.disconnect();
      this.logic.onDestroy?.();
      this.mount.innerHTML = "";
      this.hasRendered = false;
    }
    hasEventAccessPermission() {
      const config = this.payload?.config;
      return Boolean(
        config && typeof config === "object" && config.allowEventAccess === true
      );
    }
    render() {
      this.renderScheduled = false;
      const scope = createScope(this.logic, this.payload);
      this.widgetDirectory = String(
        this.payload?.widgetDirectory ?? this.payload?.directory ?? ""
      ).trim();
      const finalTemplate = rewriteInstallPathPlaceholders(options.template, this.widgetDirectory);
      const finalStyles = rewriteInstallPathPlaceholders(options.styles, this.widgetDirectory);
      const { scopedStyles, fontStyles } = extractFontFaceRules(finalStyles);
      this.syncGlobalFontStyle(fontStyles);
      const renderTemplate = createTemplateRenderer(finalTemplate);
      const html = renderTemplate(scope);
      const nextMarkup = `<style>${scopedStyles}</style>${html}`;
      if (!this.hasRendered) {
        this.mount.innerHTML = nextMarkup;
        this.hasRendered = true;
      } else {
        this.reconcileMarkup(nextMarkup);
      }
      this.mount.setAttribute("data-displayduck-render-empty", html.trim().length === 0 ? "true" : "false");
      rewriteTreeAssetUrls(this.mount, this.widgetDirectory);
      this.logic.afterRender?.();
    }
    syncGlobalFontStyle(fontStyles) {
      if (!fontStyles) {
        this.globalFontStyle?.remove();
        this.globalFontStyle = null;
        return;
      }
      if (!this.globalFontStyle) {
        this.globalFontStyle = this.mount.ownerDocument.createElement("style");
        this.globalFontStyle.dataset.displayduckPackFonts = "true";
        this.mount.ownerDocument.head.appendChild(this.globalFontStyle);
      }
      if (this.globalFontStyle.textContent !== fontStyles) {
        this.globalFontStyle.textContent = fontStyles;
      }
    }
    scheduleRender() {
      if (this.renderScheduled || this.destroyed) {
        return;
      }
      this.renderScheduled = true;
      queueMicrotask(() => {
        if (!this.destroyed && this.renderScheduled) {
          this.render();
        }
      });
    }
    reconcileMarkup(markup) {
      const nextMount = document.createElement("div");
      nextMount.innerHTML = markup;
      this.reconcileChildren(this.mount, nextMount);
    }
    reconcileChildren(currentParent, nextParent) {
      const currentChildren = Array.from(currentParent.childNodes);
      const nextChildren = Array.from(nextParent.childNodes);
      const sharedLength = Math.min(currentChildren.length, nextChildren.length);
      for (let index = 0; index < sharedLength; index += 1) {
        this.reconcileNode(currentChildren[index], nextChildren[index]);
      }
      for (let index = sharedLength; index < nextChildren.length; index += 1) {
        currentParent.appendChild(nextChildren[index].cloneNode(true));
      }
      for (let index = currentChildren.length - 1; index >= nextChildren.length; index -= 1) {
        currentChildren[index].remove();
      }
    }
    reconcileNode(currentNode, nextNode) {
      if (currentNode.nodeType !== nextNode.nodeType) {
        currentNode.replaceWith(nextNode.cloneNode(true));
        return;
      }
      if (currentNode.nodeType === Node.TEXT_NODE) {
        if (currentNode.nodeValue !== nextNode.nodeValue) {
          currentNode.nodeValue = nextNode.nodeValue;
        }
        return;
      }
      if (!(currentNode instanceof Element) || !(nextNode instanceof Element)) {
        return;
      }
      if (currentNode.tagName !== nextNode.tagName) {
        currentNode.replaceWith(nextNode.cloneNode(true));
        return;
      }
      for (const attribute of Array.from(currentNode.attributes)) {
        if (!nextNode.hasAttribute(attribute.name)) {
          currentNode.removeAttribute(attribute.name);
        }
      }
      for (const attribute of Array.from(nextNode.attributes)) {
        if (currentNode.getAttribute(attribute.name) !== attribute.value) {
          currentNode.setAttribute(attribute.name, attribute.value);
        }
      }
      this.reconcileChildren(currentNode, nextNode);
    }
    on(eventName, selector, handler) {
      const listener = (event) => {
        const target = event.target;
        const matched = target?.closest(selector);
        if (!matched || !this.mount.contains(matched)) {
          return;
        }
        handler(event, matched);
      };
      this.mount.addEventListener(eventName, listener);
      const cleanup = () => this.mount.removeEventListener(eventName, listener);
      this.cleanups.push(cleanup);
      return cleanup;
    }
  };
};
const readConfig = (payload) => {
  const config = payload.config;
  return config && typeof config === "object" ? config : {};
};
let DisplayDuckWidget$1 = class DisplayDuckWidget {
  constructor(ctx) {
    this.ctx = ctx;
    this.timer = null;
    this.payload = signal(ctx.payload ?? {});
    this.config = signal(readConfig(ctx.payload ?? {}));
    this.liveSignal = signal(false);
  }
  onInit() {
    this.timer = setInterval(() => {
      this.liveSignal.update((value) => !value);
    }, 2e3);
    console.info("[DisplayDuck Example] signal demo initialized", {
      payload: this.payload(),
      config: this.config()
    });
  }
  onUpdate(payload) {
    this.payload.set(payload ?? {});
    this.config.set(readConfig(payload ?? {}));
  }
  onDestroy() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
};
const template = `<div class="widget">
  <div class="title">
    <div class="image">
      <img src="{{ASSETS}}/img/logo.png" alt="DisplayDuck Logo" />
    </div>
    <div class="text">
      <p class="eyebrow">DisplayDuck Example pack</p>
      <h1>Simple Playground</h1>
    </div>
  </div>

  <div class="content">
    <section class="card">
        <div class="metric-list">
        <div class="metric">
          <span>
            Live signal:
          </span>
          <strong>
            <div class="signals">
              <div class="signal-state {{ liveSignal() ? 'on' : 'off' }}">
                <span class="signal-indicator"></span>
              </div>
              <div class="signal-state inverse {{ liveSignal() ? 'on' : 'off' }}">
                <span class="signal-indicator"></span>
              </div>
            </div>
          </strong>
        </div>
        <div class="metric">
          <span>Widget has event access:</span>
          <strong>{{ config().allowEventAccess === true ? 'true' : 'false' }}</strong>
        </div>
        <div class="metric">
          <span>Widget can ask focus?:</span>
          <strong>{{ config().allowFocusGrab === true ? 'true' : 'false' }}</strong>
        </div>
        <div class="metric">
          <span>Widget example boolean:</span>
          <strong>{{ config().exampleBoolean === true ? 'true' : 'false' }}</strong>
        </div>
        <div class="metric">
          <span>Widget example color:</span>
          <strong><span class="color-block" style="--selected-color: {{ config().exampleColorPicker || '#ffffff' }}"></span></strong>
        </div>
        <div class="metric">
          <span>Widget example number:</span>
          <strong>{{ config().exampleNumber ?? '--' }}</strong>
        </div>
        <div class="metric">
          <span>Widget example number:</span>
          <strong>{{ config().exampleNumber ?? '--' }}</strong>
        </div>
        <div class="metric">
          <span>Widget dropdown value:</span>
          <strong>{{ config().exampleDropdown ?? '--' }}</strong>
        </div>
        <div class="metric">
          <span>Widget name from picker:</span>
          <strong>{{ config().exampleWidgetPicker ?? '--' }}</strong>
        </div>
      </div>
    </section>
  </div>
</div>
`;
const styles = ".widget {\n  --accent: var(--color-primary);\n  height: calc(var(--host-height) - 0.5em);\n  width: calc(var(--host-width) - 0.5em);\n  color: var(--color-text);\n  font-size: clamp(0.5em, var(--host-width) / 40, 1em);\n  border: 1px solid color-mix(in srgb, var(--accent) 70%, transparent);\n  border-radius: 0.75em;\n  box-sizing: border-box;\n  overflow: auto;\n  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.015));\n}\n.widget.theme-ocean {\n  --accent: #28b8d8;\n}\n.widget.theme-sunset {\n  --accent: #ff795f;\n}\n.widget .title {\n  display: flex;\n  align-items: center;\n  gap: 0.75em;\n  padding: 0.8em 1em;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.12);\n}\n.widget .title .image {\n  display: flex;\n  flex: 0 0 2.5em;\n  height: 2.5em;\n  padding: 0.35em;\n  border-radius: 0.6em;\n  background: color-mix(in srgb, var(--accent) 22%, transparent);\n}\n.widget .title .image img {\n  width: 100%;\n  height: auto;\n  object-fit: contain;\n}\n.widget .title .text {\n  min-width: 0;\n  flex: 1;\n}\n.widget .title .text h1,\n.widget .title .text p {\n  margin: 0;\n}\n.widget .title .text h1 {\n  font-size: 1.35em;\n}\n.widget .title .text .eyebrow {\n  margin-bottom: 0.15em;\n}\n.widget .title .status {\n  display: flex;\n  align-items: center;\n  gap: 0.35em;\n  margin-top: 0.25em;\n  color: rgba(255, 255, 255, 0.62);\n  font-size: 0.72em;\n  letter-spacing: 0.08em;\n  font-weight: 700;\n}\n.widget .title .status.is-running {\n  color: #7ee6ad;\n}\n.widget .title .status .status-dot {\n  width: 0.55em;\n  height: 0.55em;\n  border-radius: 50%;\n  background: currentColor;\n}\n.widget .eyebrow {\n  color: var(--accent);\n  font-size: 0.7em;\n  font-weight: 800;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n}\n.widget h2 {\n  margin: 0.2em 0 0;\n  font-size: 1.05em;\n}\n.widget .content {\n  padding: 1em;\n}\n.widget .card {\n  padding: 1em;\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  border-radius: 0.65em;\n  background: rgba(0, 0, 0, 0.13);\n}\n.widget .card-heading {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 1em;\n}\n.widget .value-pill {\n  flex: 0 0 auto;\n  border-radius: 99em;\n  padding: 0.35em 0.6em;\n  background: color-mix(in srgb, var(--accent) 18%, transparent);\n  color: var(--accent);\n  font-size: 0.75em;\n  font-weight: 700;\n}\n.widget .metric {\n  display: flex;\n  justify-content: space-between;\n  gap: 1em;\n  color: rgba(255, 255, 255, 0.68);\n  font-size: 0.8em;\n}\n.widget .metric strong {\n  color: var(--color-text);\n}\n.widget .metric .color-block {\n  --selected-color: black;\n  display: inline-block;\n  height: 1em;\n  aspect-ratio: 2/1;\n  background: var(--selected-color);\n}\n.widget .last-action,\n.widget .hint {\n  margin: 1em 0 0;\n  color: rgba(255, 255, 255, 0.58);\n  font-size: 0.8em;\n}\n.widget .metric-list,\n.widget .config-list {\n  display: flex;\n  flex-wrap: wrap;\n}\n.widget .metric {\n  flex: 48%;\n  padding-left: 1%;\n  padding-right: 1%;\n  padding-bottom: 0.55em;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.08);\n}\n.widget .metric:last-child {\n  border: 0;\n  padding-bottom: 0;\n}\n.widget .signals {\n  display: flex;\n}\n.widget .signals .signal-state {\n  display: flex;\n  align-items: center;\n  font-size: 1.1em;\n}\n.widget .signals .signal-state.on {\n  color: #7ee6ad;\n}\n.widget .signals .signal-state.off {\n  color: rgba(255, 255, 255, 0.65);\n}\n.widget .signals .signal-state.inverse.on {\n  color: rgba(255, 255, 255, 0.65);\n}\n.widget .signals .signal-state.inverse.off {\n  color: #e67e7e;\n}\n.widget .signals .signal-state strong {\n  color: inherit;\n}\n.widget .signals .signal-state .signal-indicator {\n  width: 0.7em;\n  height: 0.7em;\n  border-radius: 50%;\n  background: currentColor;\n  box-shadow: 0 0 0.7em currentColor;\n}\n.widget .signals .signal-state .signal-indicator:first-child {\n  margin-right: 0.5em;\n}\n.widget .detail-banner {\n  margin-top: 1em;\n  padding: 0.65em;\n  border-left: 3px solid var(--accent);\n  background: color-mix(in srgb, var(--accent) 12%, transparent);\n  font-size: 0.82em;\n}\n.widget .key-value {\n  display: flex;\n  justify-content: space-between;\n  gap: 1em;\n  padding-bottom: 0.5em;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.08);\n}\n.widget .key-value .key {\n  color: rgba(255, 255, 255, 0.6);\n}\n.widget .key-value .value {\n  overflow-wrap: anywhere;\n  text-align: right;\n}\n.widget code {\n  border-radius: 0.25em;\n  padding: 0.1em 0.25em;\n  background: rgba(0, 0, 0, 0.25);\n  color: var(--accent);\n}";
const DisplayDuckWidget2 = createWidgetClass(DisplayDuckWidget$1, { template, styles });
const Widget = DisplayDuckWidget2;
const displayduckPackExample_example_entry = { DisplayDuckWidget: DisplayDuckWidget2, Widget };
export {
  DisplayDuckWidget2 as DisplayDuckWidget,
  Widget,
  displayduckPackExample_example_entry as default
};
//# sourceMappingURL=example.js.map
