const b = /* @__PURE__ */ new Map(), W = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"), I = (s) => {
  const t = b.get(s);
  if (t)
    return t;
  const n = s.replace(/\bthis\b/g, "__item"), e = new Function("scope", `with (scope) { return (${n}); }`);
  return b.set(s, e), e;
}, g = (s, t) => {
  try {
    return I(s)(t);
  } catch {
    return "";
  }
}, m = (s, t = 0, n) => {
  const e = [];
  let i = t;
  for (; i < s.length; ) {
    const r = s.indexOf("{{", i);
    if (r === -1)
      return e.push({ type: "text", value: s.slice(i) }), { nodes: e, index: s.length };
    r > i && e.push({ type: "text", value: s.slice(i, r) });
    const o = s.indexOf("}}", r + 2);
    if (o === -1)
      return e.push({ type: "text", value: s.slice(r) }), { nodes: e, index: s.length };
    const c = s.slice(r + 2, o).trim();
    if (i = o + 2, c === "/if" || c === "/each") {
      if (n === c)
        return { nodes: e, index: i };
      e.push({ type: "text", value: `{{${c}}}` });
      continue;
    }
    if (c.startsWith("#if ")) {
      const a = m(s, i, "/if");
      e.push({
        type: "if",
        condition: c.slice(4).trim(),
        children: a.nodes
      }), i = a.index;
      continue;
    }
    if (c.startsWith("#each ")) {
      const a = m(s, i, "/each");
      e.push({
        type: "each",
        source: c.slice(6).trim(),
        children: a.nodes
      }), i = a.index;
      continue;
    }
    e.push({ type: "expr", value: c });
  }
  return { nodes: e, index: i };
}, y = (s, t) => {
  let n = "";
  for (const e of s) {
    if (e.type === "text") {
      n += e.value;
      continue;
    }
    if (e.type === "expr") {
      n += W(g(e.value, t));
      continue;
    }
    if (e.type === "if") {
      g(e.condition, t) && (n += y(e.children, t));
      continue;
    }
    const i = g(e.source, t);
    if (Array.isArray(i))
      for (const r of i) {
        const o = Object.create(t);
        o.__item = r, n += y(e.children, o);
      }
  }
  return n;
}, D = (s) => {
  const t = m(s).nodes;
  return (n) => y(t, n);
};
function R(s, t = !1) {
  return window.__TAURI_INTERNALS__.transformCallback(s, t);
}
async function l(s, t = {}, n) {
  return window.__TAURI_INTERNALS__.invoke(s, t, n);
}
function k(s, t = "asset") {
  return window.__TAURI_INTERNALS__.convertFileSrc(s, t);
}
var v;
(function(s) {
  s.WINDOW_RESIZED = "tauri://resize", s.WINDOW_MOVED = "tauri://move", s.WINDOW_CLOSE_REQUESTED = "tauri://close-requested", s.WINDOW_DESTROYED = "tauri://destroyed", s.WINDOW_FOCUS = "tauri://focus", s.WINDOW_BLUR = "tauri://blur", s.WINDOW_SCALE_FACTOR_CHANGED = "tauri://scale-change", s.WINDOW_THEME_CHANGED = "tauri://theme-changed", s.WINDOW_CREATED = "tauri://window-created", s.WEBVIEW_CREATED = "tauri://webview-created", s.DRAG_ENTER = "tauri://drag-enter", s.DRAG_OVER = "tauri://drag-over", s.DRAG_DROP = "tauri://drag-drop", s.DRAG_LEAVE = "tauri://drag-leave";
})(v || (v = {}));
async function T(s, t) {
  window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(s, t), await l("plugin:event|unlisten", {
    event: s,
    eventId: t
  });
}
async function u(s, t, n) {
  var e;
  const i = (e = void 0) !== null && e !== void 0 ? e : { kind: "Any" };
  return l("plugin:event|listen", {
    event: s,
    target: i,
    handler: R(t)
  }).then((r) => async () => T(s, r));
}
const C = "pack-tcp-socket-open", L = "pack-tcp-socket-data", U = "pack-tcp-socket-close", O = 5e3, P = (s) => {
  let t = "";
  for (let n = 0; n < s.length; n += 1)
    t += String.fromCharCode(s[n]);
  return btoa(t);
}, F = (s) => {
  const t = atob(s), n = new Uint8Array(t.length);
  for (let e = 0; e < t.length; e += 1)
    n[e] = t.charCodeAt(e);
  return n;
}, N = (s) => s instanceof Uint8Array ? s : s instanceof ArrayBuffer ? new Uint8Array(s) : Uint8Array.from(s), $ = () => typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `tcp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
class M {
  constructor(t, n) {
    this.hasLocalhostAccess = n, this.isConnected = !1, this.connecting = null, this.tauriListenersReady = null, this.tauriUnlisteners = [], this.listeners = {
      open: /* @__PURE__ */ new Set(),
      data: /* @__PURE__ */ new Set(),
      close: /* @__PURE__ */ new Set(),
      error: /* @__PURE__ */ new Set()
    }, this.host = String(t.host ?? "").trim(), this.port = Number(t.port), this.sessionId = $();
  }
  get connected() {
    return this.isConnected;
  }
  async connect() {
    if (!this.hasLocalhostAccess)
      throw new Error("TCP socket access requires the Allow localhost access permission.");
    if (!this.isConnected) {
      if (this.connecting)
        return this.connecting;
      if (!this.host || !Number.isInteger(this.port) || this.port < 1 || this.port > 65535)
        throw new Error("A valid TCP socket host and port are required.");
      this.connecting = this.connectInternal();
      try {
        await this.connecting;
      } finally {
        this.connecting = null;
      }
    }
  }
  async send(t) {
    if (!this.isConnected)
      throw new Error("TCP socket is not connected.");
    await l("pack_tcp_socket_write", {
      sessionId: this.sessionId,
      dataBase64: P(N(t)),
      allowLocalhostAccess: this.hasLocalhostAccess
    });
  }
  async write(t) {
    await this.send(t);
  }
  async close() {
    try {
      await l("pack_tcp_socket_disconnect", { sessionId: this.sessionId });
    } finally {
      this.isConnected = !1, this.teardownTauriListeners();
    }
  }
  on(t, n) {
    return this.listeners[t].add(n), () => this.listeners[t].delete(n);
  }
  async connectInternal() {
    await this.ensureTauriListeners(), await new Promise(async (t, n) => {
      let e = !1;
      const i = setTimeout(() => {
        e || (e = !0, c(), n(new Error(`TCP socket connection timed out for ${this.host}:${this.port}`)));
      }, O), r = this.on("open", () => {
        e || (e = !0, c(), t());
      }), o = this.on("close", (a) => {
        e || (e = !0, c(), n(new Error(a.error ?? "TCP socket closed before opening.")));
      }), c = () => {
        clearTimeout(i), r(), o();
      };
      try {
        await l("pack_tcp_socket_connect", {
          sessionId: this.sessionId,
          host: this.host,
          port: this.port,
          allowLocalhostAccess: this.hasLocalhostAccess
        });
      } catch (a) {
        if (e) return;
        e = !0, c(), n(a);
      }
    });
  }
  async ensureTauriListeners() {
    return this.tauriListenersReady ? this.tauriListenersReady : (this.tauriListenersReady = (async () => {
      this.tauriUnlisteners = [
        await u(C, (t) => {
          t.payload.sessionId === this.sessionId && (this.isConnected = !0, this.emit("open", {
            host: this.host,
            port: this.port
          }));
        }),
        await u(L, (t) => {
          if (t.payload.sessionId === this.sessionId)
            try {
              this.emit("data", F(t.payload.dataBase64));
            } catch (n) {
              this.emit("error", {
                host: this.host,
                port: this.port,
                error: n instanceof Error ? n.message : "Invalid TCP socket data."
              });
            }
        }),
        await u(U, (t) => {
          t.payload.sessionId === this.sessionId && (this.isConnected = !1, t.payload.error && this.emit("error", {
            host: this.host,
            port: this.port,
            error: t.payload.error
          }), this.emit("close", {
            host: this.host,
            port: this.port,
            error: t.payload.error
          }));
        })
      ];
    })(), this.tauriListenersReady);
  }
  teardownTauriListeners() {
    for (const t of this.tauriUnlisteners)
      try {
        t();
      } catch {
      }
    this.tauriUnlisteners = [], this.tauriListenersReady = null;
  }
  emit(t, n) {
    for (const e of this.listeners[t])
      e(n);
  }
}
const V = (s) => {
  if (typeof s != "function")
    return !1;
  const t = s;
  return t._isSignal === !0 && typeof t.set == "function" && typeof t.subscribe == "function";
}, p = (s) => {
  let t = s;
  const n = /* @__PURE__ */ new Set(), e = (() => t);
  return e._isSignal = !0, e.set = (i) => {
    if (!Object.is(t, i)) {
      t = i;
      for (const r of n)
        r(t);
    }
  }, e.update = (i) => {
    e.set(i(t));
  }, e.subscribe = (i) => (n.add(i), () => n.delete(i)), e;
}, z = (s, t = "") => l("controller_widget_focus_view", {
  configuredWidgetId: s,
  requestId: t
}), B = async (s, t) => {
  const n = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let e = null, i = null;
  const r = new Promise((o) => {
    i = o;
  });
  try {
    return e = await u(
      "displayduck-widget-focus-state-response",
      (o) => {
        o.payload.requestId !== n || o.payload.configuredWidgetId !== s || i?.(o.payload.focused === !0);
      }
    ), await l("controller_widget_get_focus_state", {
      configuredWidgetId: s,
      focusRequestId: t,
      requestId: n
    }), await Promise.race([
      r,
      new Promise((o) => setTimeout(() => o(!1), 1e3))
    ]);
  } finally {
    e?.();
  }
}, q = (s, t, n) => l("controller_widget_set_focus_requirement", {
  configuredWidgetId: s,
  required: t,
  requestId: n
}), j = (s, t) => {
  const n = [];
  for (const e of Object.keys(s)) {
    const i = s[e];
    V(i) && n.push(i.subscribe(() => t()));
  }
  return () => {
    for (const e of n)
      e();
  };
}, G = (s, t) => new Proxy(
  { payload: t },
  {
    get(n, e) {
      if (typeof e != "string")
        return;
      if (e in n)
        return n[e];
      const i = s[e];
      return typeof i == "function" ? i.bind(s) : i;
    },
    has(n, e) {
      return typeof e != "string" ? !1 : e in n || e in s;
    }
  }
), H = ["src", "href", "poster"], J = "{{pack-install-path}}/", S = "{{ASSETS}}", K = (s) => {
  const t = s.trim();
  return t.length === 0 || t.startsWith("data:") || t.startsWith("blob:") || t.startsWith("http://") || t.startsWith("https://") || t.startsWith("file:") || t.startsWith("asset:") || t.startsWith("mailto:") || t.startsWith("tel:") || t.startsWith("javascript:") || t.startsWith("//") || t.startsWith("/") || t.startsWith("#");
}, Q = (s) => {
  const t = s.trim();
  if (!t)
    return null;
  if (!K(t))
    return t.replace(/^\.\/+/, "").replace(/^\/+/, "");
  if (t.startsWith("http://") || t.startsWith("https://"))
    try {
      const n = new URL(t);
      if (n.origin === window.location.origin)
        return `${n.pathname}${n.search}${n.hash}`.replace(/^\/+/, "");
    } catch {
      return null;
    }
  return null;
}, X = (s, t) => {
  const n = s.replaceAll("\\", "/").replace(/\/+$/, ""), e = `${n}/${t.trim()}`, i = e.split("/"), r = [];
  for (const o of i) {
    if (!o || o === ".") {
      r.length === 0 && e.startsWith("/") && r.push("");
      continue;
    }
    if (o === "..") {
      (r.length > 1 || r.length === 1 && r[0] !== "") && r.pop();
      continue;
    }
    r.push(o);
  }
  return r.join("/") || n;
}, h = (s, t) => {
  const n = Q(t);
  if (!s || !n)
    return t;
  try {
    return k(X(s, n));
  } catch {
    return t;
  }
}, Y = (s) => {
  const t = s.trim().replaceAll("\\", "/").replace(/\/+$/, "");
  if (!t)
    return "";
  try {
    return k(t);
  } catch {
    return t;
  }
}, Z = (s, t) => s.split(",").map((n) => {
  const e = n.trim();
  if (!e)
    return e;
  const [i, r] = e.split(/\s+/, 2), o = h(t, i);
  return r ? `${o} ${r}` : o;
}).join(", "), tt = (s, t) => s.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (n, e, i) => {
  const r = h(t, i);
  return r === i ? n : `url("${r}")`;
}), w = (s, t) => {
  for (const i of H) {
    const r = s.getAttribute(i);
    if (!r)
      continue;
    const o = h(t, r);
    o !== r && s.setAttribute(i, o);
  }
  const n = s.getAttribute("srcset");
  if (n) {
    const i = Z(n, t);
    i !== n && s.setAttribute("srcset", i);
  }
  const e = s.getAttribute("style");
  if (e) {
    const i = tt(e, t);
    i !== e && s.setAttribute("style", i);
  }
}, A = (s, t) => {
  if (t) {
    s instanceof Element && w(s, t);
    for (const n of Array.from(s.querySelectorAll("*")))
      w(n, t);
  }
}, _ = (s, t) => {
  if (!t)
    return s;
  let n = s;
  const e = Y(t);
  return e && n.includes(S) && (n = n.replaceAll(S, e)), n.includes(J) ? n.replace(/\{\{pack-install-path\}\}\/([^"')\s]+)/g, (i, r) => h(t, r)) : n;
}, et = (s) => {
  const t = /@font-face\s*\{[^{}]*\}/gi, n = s.match(t)?.join(`
`) ?? "";
  return {
    scopedStyles: n ? s.replace(t, "") : s,
    fontStyles: n
  };
}, st = (s, t) => class {
  constructor({
    mount: e,
    payload: i,
    setLoading: r
  }) {
    this.cleanups = [], this.hasRendered = !1, this.renderScheduled = !1, this.destroyed = !1, this.globalFontStyle = null, this.focusRequestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, this.widgetDirectory = "", this.mount = e, this.payload = i ?? {}, this.setLoading = typeof r == "function" ? r : (() => {
    }), this.assetObserver = new MutationObserver((o) => {
      if (this.widgetDirectory)
        for (const c of o) {
          if (c.type === "attributes" && c.target instanceof Element) {
            w(c.target, this.widgetDirectory);
            continue;
          }
          for (const a of Array.from(c.addedNodes))
            a instanceof Element && A(a, this.widgetDirectory);
        }
    }), this.logic = new s({
      mount: e,
      payload: this.payload,
      setLoading: (o) => this.setLoading(!!o),
      focusWidgetView: () => z(
        String(this.payload?.configuredWidgetId ?? "").trim(),
        this.focusRequestId
      ),
      isWidgetViewFocused: () => B(
        String(this.payload?.configuredWidgetId ?? "").trim(),
        this.focusRequestId
      ),
      setRequireFocus: (o) => q(
        String(this.payload?.configuredWidgetId ?? "").trim(),
        !!o,
        this.focusRequestId
      ),
      createTcpSocket: (o) => new M(
        o,
        this.hasLocalhostAccessPermission()
      ),
      on: (o, c, a) => this.on(o, c, a)
    }), this.cleanupSignalSubscriptions = j(this.logic, () => this.scheduleRender()), this.assetObserver.observe(this.mount, {
      subtree: !0,
      childList: !0,
      attributes: !0,
      attributeFilter: ["src", "href", "poster", "srcset", "style"]
    });
  }
  onInit() {
    this.render(), this.logic.onInit?.();
  }
  onUpdate(e) {
    this.payload = e ?? {}, this.logic.onUpdate?.(this.payload), this.render();
  }
  onDestroy() {
    for (this.destroyed = !0, this.renderScheduled = !1, this.globalFontStyle?.remove(), this.globalFontStyle = null, this.cleanupSignalSubscriptions(); this.cleanups.length > 0; )
      this.cleanups.pop()?.();
    this.assetObserver.disconnect(), this.logic.onDestroy?.(), this.mount.innerHTML = "", this.hasRendered = !1;
  }
  hasLocalhostAccessPermission() {
    const e = this.payload?.config;
    return !!(e && typeof e == "object" && e.allowEventAccess === !0);
  }
  render() {
    this.renderScheduled = !1;
    const e = G(this.logic, this.payload);
    this.widgetDirectory = String(
      this.payload?.widgetDirectory ?? this.payload?.directory ?? ""
    ).trim();
    const i = _(t.template, this.widgetDirectory), r = _(t.styles, this.widgetDirectory), { scopedStyles: o, fontStyles: c } = et(r);
    this.syncGlobalFontStyle(c);
    const f = D(i)(e), d = `<style>${o}</style>${f}`;
    this.hasRendered ? this.reconcileMarkup(d) : (this.mount.innerHTML = d, this.hasRendered = !0), this.mount.setAttribute("data-displayduck-render-empty", f.trim().length === 0 ? "true" : "false"), A(this.mount, this.widgetDirectory), this.logic.afterRender?.();
  }
  syncGlobalFontStyle(e) {
    if (!e) {
      this.globalFontStyle?.remove(), this.globalFontStyle = null;
      return;
    }
    this.globalFontStyle || (this.globalFontStyle = this.mount.ownerDocument.createElement("style"), this.globalFontStyle.dataset.displayduckPackFonts = "true", this.mount.ownerDocument.head.appendChild(this.globalFontStyle)), this.globalFontStyle.textContent !== e && (this.globalFontStyle.textContent = e);
  }
  scheduleRender() {
    this.renderScheduled || this.destroyed || (this.renderScheduled = !0, queueMicrotask(() => {
      !this.destroyed && this.renderScheduled && this.render();
    }));
  }
  reconcileMarkup(e) {
    const i = document.createElement("div");
    i.innerHTML = e, this.reconcileChildren(this.mount, i);
  }
  reconcileChildren(e, i) {
    const r = Array.from(e.childNodes), o = Array.from(i.childNodes), c = Math.min(r.length, o.length);
    for (let a = 0; a < c; a += 1)
      this.reconcileNode(r[a], o[a]);
    for (let a = c; a < o.length; a += 1)
      e.appendChild(o[a].cloneNode(!0));
    for (let a = r.length - 1; a >= o.length; a -= 1)
      r[a].remove();
  }
  reconcileNode(e, i) {
    if (e.nodeType !== i.nodeType) {
      e.replaceWith(i.cloneNode(!0));
      return;
    }
    if (e.nodeType === Node.TEXT_NODE) {
      e.nodeValue !== i.nodeValue && (e.nodeValue = i.nodeValue);
      return;
    }
    if (!(!(e instanceof Element) || !(i instanceof Element))) {
      if (e.tagName !== i.tagName) {
        e.replaceWith(i.cloneNode(!0));
        return;
      }
      for (const r of Array.from(e.attributes))
        i.hasAttribute(r.name) || e.removeAttribute(r.name);
      for (const r of Array.from(i.attributes))
        e.getAttribute(r.name) !== r.value && e.setAttribute(r.name, r.value);
      this.reconcileChildren(e, i);
    }
  }
  on(e, i, r) {
    const o = (a) => {
      const d = a.target?.closest(i);
      !d || !this.mount.contains(d) || r(a, d);
    };
    this.mount.addEventListener(e, o);
    const c = () => this.mount.removeEventListener(e, o);
    return this.cleanups.push(c), c;
  }
}, x = (s) => {
  const t = s.config;
  return t && typeof t == "object" ? t : {};
};
let nt = class {
  constructor(t) {
    this.ctx = t, this.timer = null, this.payload = p(t.payload ?? {}), this.config = p(x(t.payload ?? {})), this.liveSignal = p(!1);
  }
  onInit() {
    this.timer = setInterval(() => {
      this.liveSignal.update((t) => !t);
    }, 2e3), console.info("[DisplayDuck Example] signal demo initialized", {
      payload: this.payload(),
      config: this.config()
    });
  }
  onUpdate(t) {
    this.payload.set(t ?? {}), this.config.set(x(t ?? {}));
  }
  onDestroy() {
    this.timer !== null && (clearInterval(this.timer), this.timer = null);
  }
};
const it = `<div class="widget">
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
          <span>Widget has localhost access:</span>
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
`, rt = ".widget{--accent: var(--color-primary);height:calc(var(--host-height) - .5em);width:calc(var(--host-width) - .5em);color:var(--color-text);font-size:clamp(.5em,var(--host-width) / 40,1em);border:1px solid color-mix(in srgb,var(--accent) 70%,transparent);border-radius:.75em;box-sizing:border-box;overflow:auto;background:linear-gradient(135deg,#ffffff14,#ffffff04)}.widget.theme-ocean{--accent: #28b8d8}.widget.theme-sunset{--accent: #ff795f}.widget .title{display:flex;align-items:center;gap:.75em;padding:.8em 1em;border-bottom:1px solid rgba(255,255,255,.12)}.widget .title .image{display:flex;flex:0 0 2.5em;height:2.5em;padding:.35em;border-radius:.6em;background:color-mix(in srgb,var(--accent) 22%,transparent)}.widget .title .image img{width:100%;height:auto;object-fit:contain}.widget .title .text{min-width:0;flex:1}.widget .title .text h1,.widget .title .text p{margin:0}.widget .title .text h1{font-size:1.35em}.widget .title .text .eyebrow{margin-bottom:.15em}.widget .title .status{display:flex;align-items:center;gap:.35em;margin-top:.25em;color:#ffffff9e;font-size:.72em;letter-spacing:.08em;font-weight:700}.widget .title .status.is-running{color:#7ee6ad}.widget .title .status .status-dot{width:.55em;height:.55em;border-radius:50%;background:currentColor}.widget .eyebrow{color:var(--accent);font-size:.7em;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.widget h2{margin:.2em 0 0;font-size:1.05em}.widget .content{padding:1em}.widget .card{padding:1em;border:1px solid rgba(255,255,255,.1);border-radius:.65em;background:#00000021}.widget .card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1em}.widget .value-pill{flex:0 0 auto;border-radius:99em;padding:.35em .6em;background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent);font-size:.75em;font-weight:700}.widget .metric{display:flex;justify-content:space-between;gap:1em;color:#ffffffad;font-size:.8em}.widget .metric strong{color:var(--color-text)}.widget .metric .color-block{--selected-color: black;display:inline-block;height:1em;aspect-ratio:2/1;background:var(--selected-color)}.widget .last-action,.widget .hint{margin:1em 0 0;color:#ffffff94;font-size:.8em}.widget .metric-list,.widget .config-list{display:flex;flex-wrap:wrap}.widget .metric{flex:48%;padding-left:1%;padding-right:1%;padding-bottom:.55em;border-bottom:1px solid rgba(255,255,255,.08)}.widget .metric:last-child{border:0;padding-bottom:0}.widget .signals{display:flex}.widget .signals .signal-state{display:flex;align-items:center;font-size:1.1em}.widget .signals .signal-state.on{color:#7ee6ad}.widget .signals .signal-state.off,.widget .signals .signal-state.inverse.on{color:#ffffffa6}.widget .signals .signal-state.inverse.off{color:#e67e7e}.widget .signals .signal-state strong{color:inherit}.widget .signals .signal-state .signal-indicator{width:.7em;height:.7em;border-radius:50%;background:currentColor;box-shadow:0 0 .7em currentColor}.widget .signals .signal-state .signal-indicator:first-child{margin-right:.5em}.widget .detail-banner{margin-top:1em;padding:.65em;border-left:3px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);font-size:.82em}.widget .key-value{display:flex;justify-content:space-between;gap:1em;padding-bottom:.5em;border-bottom:1px solid rgba(255,255,255,.08)}.widget .key-value .key{color:#fff9}.widget .key-value .value{overflow-wrap:anywhere;text-align:right}.widget code{border-radius:.25em;padding:.1em .25em;background:#00000040;color:var(--accent)}", E = st(nt, { template: it, styles: rt }), ot = E, lt = { DisplayDuckWidget: E, Widget: ot };
export {
  E as DisplayDuckWidget,
  ot as Widget,
  lt as default
};
