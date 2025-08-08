(() => {
  const $ = (id) => document.getElementById(id);
  const editor = $("editor");
  const codeBlock = $("codeBlock");
  const badgeLang = $("badgeLang");
  const pasteTitle = $("pasteTitle");
  const hashInfo = $("hashInfo");
  const langSelect = $("lang");
  const titleInput = $("title");
  const expansionSelect = $("expansion");
  const themeBtn = $("themeBtn");

  // Base64 encode/decode safe
  function b64enc(s) {
    return btoa(unescape(encodeURIComponent(s)));
  }
  function b64dec(s) {
    try {
      return decodeURIComponent(escape(atob(s)));
    } catch {
      return null;
    }
  }

  // Atualiza a hash da URL com os dados
  function setHashFromData(obj) {
    const json = JSON.stringify(obj);
    const b = b64enc(json);
    location.hash = b;
    updateHashInfo();
  }

  // Lê dados da hash da URL
  function readDataFromHash() {
    if (!location.hash) return null;
    const b = location.hash.slice(1);
    const json = b64dec(b);
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  // Atualiza texto da hash na UI
  function updateHashInfo() {
    if (location.hash) {
      const short = location.hash.slice(1, 9);
      hashInfo.textContent = "hash: #" + short + " • Copie a URL para compartilhar";
    } else {
      hashInfo.textContent = "URL: —";
    }
  }

  // Escape HTML básico
  function escapeHtml(str) {
    return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  // Highlighters simples para algumas linguagens
  const HIGHLIGHTERS = {
    javascript: (s) =>
      escapeHtml(s)
        .replace(/(\/\/.*$)/gm, '<span class="tok-cm">$1</span>')
        .replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="tok-str">$1</span>')
        .replace(
          /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|new|class|extends|import|from|export|await|async|try|catch)\b/g,
          '<span class="tok-k">$1</span>'
        )
        .replace(/\b([A-Za-z_]\w*)(?=\s*\()/g, '<span class="tok-fn">$1</span>'),
    lua: (s) =>
      escapeHtml(s)
        .replace(/(--.*$)/gm, '<span class="tok-cm">$1</span>')
        .replace(/(".*?"|'.*?')/g, '<span class="tok-str">$1</span>')
        .replace(
          /\b(local|function|end|if|then|else|for|in|while|do|repeat|until|return|nil|true|false)\b/g,
          '<span class="tok-k">$1</span>'
        )
        .replace(/\b([A-Za-z_]\w*)(?=\s*\()/g, '<span class="tok-fn">$1</span>'),
    python: (s) =>
      escapeHtml(s)
        .replace(/(#.*$)/gm, '<span class="tok-cm">$1</span>')
        .replace(/(".*?"|'.*?')/g, '<span class="tok-str">$1</span>')
        .replace(
          /\b(def|class|return|if|elif|else|for|while|try|except|with|as|import|from|pass|break|continue|lambda|True|False|None)\b/g,
          '<span class="tok-k">$1</span>'
        )
        .replace(/\b([A-Za-z_]\w*)(?=\s*\()/g, '<span class="tok-fn">$1</span>'),
    html: (s) =>
      escapeHtml(s)
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-cm">$1</span>')
        .replace(/(&lt;\/?[^\s&]+?)(\s|&gt;)/g, '<span class="tok-k">$1</span>$2')
        .replace(/(".*?"|'.*?')/g, '<span class="tok-str">$1</span>'),
    css: (s) =>
      escapeHtml(s)
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-cm">$1</span>')
        .replace(/([.#]?[a-zA-Z0-9\-\_]+)(?=\s*\{)/g, '<span class="tok-k">$1</span>')
        .replace(/(:\s*)([^;}\n]+)/g, '$1<span class="tok-str">$2</span>'),
    default: (s) => escapeHtml(s),
  };

  // Detecta linguagem básica
  function detectLang(text) {
    const t = text.slice(0, 2000).toLowerCase();
    if (t.includes("<?php") || /<\s*html/.test(t)) return "html";
    if (/\bfunction\b/.test(t) && /=>/.test(t)) return "javascript";
    if (/\b(local|function|end)\b/.test(t)) return "lua";
    if (/\b(def|elif|import|from)\b/.test(t)) return "python";
    if (t.trim().startsWith("{") && /:\s*["'{\[]?/.test(t)) return "json";
    if (t.includes("{") && t.includes("}")) return "css";
    return "text";
  }

  // Renderiza preview com destaque
  function renderPreview() {
    const maxPreviewLength = 10000;
    const lang = langSelect.value === "auto" ? detectLang(editor.value) : langSelect.value;
    badgeLang.textContent = lang;
    pasteTitle.textContent = titleInput.value || "—";

    if (editor.value.length > maxPreviewLength) {
      codeBlock.innerHTML = `<i>Conteúdo muito grande para exibir preview (mais de ${maxPreviewLength} caracteres).</i>`;
    } else {
      const html = (HIGHLIGHTERS[lang] || HIGHLIGHTERS.default)(editor.value || " ");
      codeBlock.innerHTML = html;
    }
  }

  // Copiar para área de transferência
  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(editor.value);
      alert("Copiado para a área de transferência.");
    } catch {
      prompt("Copiar manualmente:", editor.value);
    }
  }

  // Download conteúdo
  function downloadContent(filename, content) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  // Carregar dados em campos e preview
  function loadData(obj) {
    if (!obj) return;
    titleInput.value = obj.title || "";
    langSelect.value = obj.lang || "auto";
    editor.value = obj.content || "";
    renderPreview();
  }

  // Salvar localStorage (se ativado)
  function saveToLocalStorage() {
    if (expansionSelect.value !== "local") {
      localStorage.removeItem("kitsune_paste_data");
      return;
    }
    const data = {
      title: titleInput.value,
      lang: langSelect.value,
      content: editor.value,
    };
    localStorage.setItem("kitsune_paste_data", JSON.stringify(data));
  }

  // Carregar localStorage
  function loadFromLocalStorage() {
    const raw = localStorage.getItem("kitsune_paste_data");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // Muda tema dark/light
  function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.style.getPropertyValue("--bg") === "#0b0e0f" || !root.style.getPropertyValue("--bg");

    if (isDark) {
      root.style.setProperty("--bg", "#fff");
      root.style.setProperty("--panel", "#f0f0f0");
      root.style.setProperty("--muted", "#666");
      root.style.setProperty("--accent", "#2dd36f");
      root.style.setProperty("--danger", "#ff6b6b");
      root.style.setProperty("--glass", "rgba(0,0,0,0.05)");
      document.body.style.color = "#222";
    } else {
      root.style.setProperty("--bg", "#0b0e0f");
      root.style.setProperty("--panel", "#0f1515");
      root.style.setProperty("--muted", "#98a3a3");
      root.style.setProperty("--accent", "#2dd36f");
      root.style.setProperty("--danger", "#ff6b6b");
      root.style.setProperty("--glass", "rgba(255,255,255,0.03)");
      document.body.style.color = "#dfeeea";
    }
  }

  // Eventos de input para atualizar preview e salvar
  editor.addEventListener("input", () => {
    renderPreview();
    saveToLocalStorage();
  });
  titleInput.addEventListener("input", () => {
    renderPreview();
    saveToLocalStorage();
  });
  langSelect.addEventListener("change", () => {
    renderPreview();
    saveToLocalStorage();
  });
  expansionSelect.addEventListener("change", () => {
    saveToLocalStorage();
  });

  // Botões
  $("saveBtn").addEventListener("click", () => {
    const data = {
      title: titleInput.value,
      lang: langSelect.value,
      content: editor.value,
    };
    setHashFromData(data);
    alert("Link gerado! Copie a URL para compartilhar.");
  });

  $("rawBtn").addEventListener("click", () => {
    const blob = new Blob([editor.value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  });

  $("copyBtn").addEventListener("click", () => {
    copyToClipboard();
  });

  $("downloadBtn").addEventListener("click", () => {
    let ext = "txt";
    switch (langSelect.value) {
      case "javascript":
        ext = "js";
        break;
      case "lua":
        ext = "lua";
        break;
      case "python":
        ext = "py";
        break;
      case "html":
        ext = "html";
        break;
      case "css":
        ext = "css";
        break;
      case "bash":
        ext = "sh";
        break;
      case "json":
        ext = "json";
        break;
    }
    const filename = (titleInput.value || "paste") + "." + ext;
    downloadContent(filename, editor.value);
  });

  $("clearBtn").addEventListener("click", () => {
    if (confirm("Tem certeza que deseja limpar o conteúdo?")) {
      editor.value = "";
      titleInput.value = "";
      langSelect.value = "auto";
      expansionSelect.value = "none";
      renderPreview();
      localStorage.removeItem("kitsune_paste_data");
      location.hash = "";
      updateHashInfo();
    }
  });

  themeBtn.addEventListener("click", () => {
    toggleTheme();
  });

  // Inicialização ao carregar página
  window.addEventListener("load", () => {
    const hashData = readDataFromHash();
    if (hashData) {
      loadData(hashData);
      expansionSelect.value = "none";
    } else {
      const localData = loadFromLocalStorage();
      if (localData) {
        loadData(localData);
        expansionSelect.value = "local";
      }
    }
    updateHashInfo();
    renderPreview();
  });
})();
