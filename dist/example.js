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
const createWidgetClass = (WidgetImpl, options) => {
  return class RuntimeWidget {
    constructor({
      mount,
      payload,
      setLoading
    }) {
      this.cleanups = [];
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
        on: (eventName, selector, handler) => this.on(eventName, selector, handler)
      });
      this.cleanupSignalSubscriptions = bindSignals(this.logic, () => this.render());
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
      this.cleanupSignalSubscriptions();
      while (this.cleanups.length > 0) {
        const cleanup = this.cleanups.pop();
        cleanup?.();
      }
      this.assetObserver.disconnect();
      this.logic.onDestroy?.();
      this.mount.innerHTML = "";
    }
    render() {
      const scope = createScope(this.logic, this.payload);
      this.widgetDirectory = String(
        this.payload?.widgetDirectory ?? this.payload?.directory ?? ""
      ).trim();
      const finalTemplate = rewriteInstallPathPlaceholders(options.template, this.widgetDirectory);
      const finalStyles = rewriteInstallPathPlaceholders(options.styles, this.widgetDirectory);
      const renderTemplate = createTemplateRenderer(finalTemplate);
      const html = renderTemplate(scope);
      this.mount.innerHTML = `<style>${finalStyles}</style>${html}`;
      this.mount.setAttribute("data-displayduck-render-empty", html.trim().length === 0 ? "true" : "false");
      rewriteTreeAssetUrls(this.mount, this.widgetDirectory);
      this.logic.afterRender?.();
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
let DisplayDuckWidget$1 = class DisplayDuckWidget {
  constructor(ctx) {
    this.ctx = ctx;
    this.config = signal(ctx.payload ?? {});
    this.showConfig = signal(false);
  }
  onInit() {
    this.ctx.on("click", "#btn", () => {
      this.showConfig.set(!this.showConfig());
    });
    console.warn("This is a console log from the example widget!");
  }
  onDestroy() {
  }
};
const template = '<div class="widget">\n  <div class="title">\n    <div class="image">\n      <img src="{{ASSETS}}/img/logo.png" alt="DisplayDuck Logo" />\n    </div>\n    <div class="text">\n      <h1>Example Widgeth</h1>\n    </div>\n  </div>\n  <div class="content">\n    <p>This is an example widget for development purposes.</p>\n    <button id="btn">Show passed config</button>\n    {{#if showConfig()}}\n      <div>\n        {{#each Object.entries(config().config || {})}}\n          <div class="key-value">\n            <span class="key">\n              {{ this[0] }}:\n            </span>\n            <span class="value">\n              {{ this[1] }}\n            </span>\n          </div>\n        {{/each}}\n      </div>\n    {{/if}}\n  </div>\n</div>\n';
const styles = ".widget {\n  height: calc(var(--host-height) - 0.5em);\n  width: calc(var(--host-width) - 0.5em);\n  color: var(--color-text);\n  font-size: 1em;\n  border: 1px solid var(--color-primary);\n  border-radius: 0.5em;\n  box-sizing: border-box;\n  overflow: auto;\n}\n.widget .title {\n  display: flex;\n  background: rgba(255, 255, 255, 0.05);\n  border-bottom: 1px solid var(--color-primary);\n  padding: 1em;\n  justify-content: center;\n}\n.widget .title .image {\n  display: flex;\n  padding-right: 1em;\n}\n.widget .title .image img {\n  width: 100%;\n  max-width: 3em;\n  height: auto;\n  object-fit: contain;\n}\n.widget .title .text {\n  display: flex;\n}\n.widget .title .text h1 {\n  margin: 0;\n}\n.widget .content {\n  padding: 1em;\n}\n.widget .content button {\n  background: var(--color-primary);\n  border-radius: 0.25em;\n  border: none;\n  text-transform: uppercase;\n  padding: 0.5em 1em;\n  font-size: 1em;\n}\n.widget .content .key-value {\n  display: flex;\n}\n.widget .content .key-value .key {\n  font-weight: 700;\n  padding-right: 0.5em;\n}";
const DisplayDuckWidget2 = createWidgetClass(DisplayDuckWidget$1, { template, styles });
const Widget = DisplayDuckWidget2;
const displayduckPackExample_example_entry = { DisplayDuckWidget: DisplayDuckWidget2, Widget };
export {
  DisplayDuckWidget2 as DisplayDuckWidget,
  Widget,
  displayduckPackExample_example_entry as default
};
//# sourceMappingURL=example.js.map
