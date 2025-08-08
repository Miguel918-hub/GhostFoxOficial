const $ = (id) => document.getElementById(id);
const editor = $("editor");
const codeBlock = $("codeBlock");
const badgeLang = $("badgeLang");
const pasteTitle = $("pasteTitle");
const hashInfo = $("hashInfo");
const langSelect = $("lang");
const titleInput = $("title");
const expansionSelect = $("expansion");

// Base64 encode/decode helpers
function b64enc(s) {
  return btoa(unescape(encodeURIComponent(s)));
}
function b64dec(s) {
  try {
    return decodeURIComponent(escape(atob(s)));
  } catch (e) {
    return null;
  }
}

// Atualiza a hash da URL com os dados codificados
function setHashFromData(obj) {
  const json = JSON.stringify(obj);
  const b = b64enc(json);
  location.hash = b;
  updateHashInfo();
}

// Lê dados da hash atual da URL e decodifica
function readDataFromHash() {
  if (!location.hash) return null;
  const b = location.hash.slice(1);
  const json = b64dec(b);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

// Atualiza texto informativo sobre hash
function updateHashInfo() {
  if (location.hash) {
    const short = location.hash.slice(1, 9);
    hashInfo.textContent = "hash: #" + short + " • Copie a URL para compartilhar";
  } else {
    hashInfo.textContent = "URL: —";
  }
}

// Escape simples para HTML
function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Highlight simples para algumas linguagens
const HIGHLIGHTERS = {
  javascript: (str) => {
    return escapeHtml(str)
      .replace(/(\/\/.*$)/gm, '<span class="tok-cm">$1</span>')
      .replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="tok-str">$1</span>')
      .replace(
        /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|new|class|extends|import|from|export|await|async|try|catch)\b/g,
        '<span class="tok-k">$1</span>'
      )
      .replace(/\b([A-Za-z_]\w*)(?=\s*\()/g, '<span class="tok-fn">$1</span>');
  },
  lua: (str) => {
    return escapeHtml(str)
      .replace(/(--.*$)/gm, '<span class="tok-cm">$1</span>')
      .replace(/(".*?"|'.*?')/g, '<span class="tok-str">$1</span>')
      .replace(
        /\b(local|function|end|if|then|else|for|in|while|do|repeat|until|return|nil|true|false)\b/g,
        '<span class="tok-k">$1</span>'
      )
      .replace(/\b([A-Za-z_]\w*)(?=\s*\()/g, '<span class="tok-fn">$1</span>');
  },
  python: (str) => {
    return escapeHtml(str)
      .replace(/(#.*$)/gm, '<span class="tok-cm">$1</span>')
      .replace(/(".*?"|'.*?')/g, '<span class="tok-str">$1</span>')
      .replace(
        /\b(def|class|return|if|elif|else|for|while|try|except|with|as|import|from|pass|break|continue|lambda|True|False|None)\b/g,
        '<span class="tok-k">$1</span>'
      )
      .replace(/\b([A-Za-z_]\w*)(?=\s*\()/g, '<span class="tok-fn">$1</span>');
  },
  html: (str) => {
    return escapeHtml(str)
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-cm">$1</span>')
      .replace(/(&lt;\/?[^\s&]+?)(\s|&gt;)/g, '<span class="tok-k">$1</span>$2')
      .replace(/(".*?"|'.*?')/g, '<span class="tok-str">$1</span>');
  },
  css: (str) => {
    return escapeHtml(str)
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-cm">$1</span>')
      .replace(/([.#]?[a-zA-Z0-9\-\_]+)(?=\s*\{)/g, '<span class="tok-k">$1</span>')
      .replace(/(:\s*)([^;}\n]+)/g, '$1<span class="tok-str">$2</span>');
  },
  default: (str) => escapeHtml(str),
};

// Detecta linguagem básica pelo conteúdo
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

// Highlight wrapper
function highlightText(lang, text) {
  const fn = HIGHLIGHTERS[lang] || HIGHLIGHTERS.default;
  try {
    return fn(text);
  } catch {
    return escapeHtml(text);
  }
}

// Renderiza o preview com highlight
function renderPreview() {
  const maxPreviewLength = 10000; // Limite de caracteres para o preview
  const lang = langSelect.value === "auto" ? detectLang(editor.value) : langSelect.value;
  badgeLang.textContent = lang;
  pasteTitle.textContent = titleInput.value || "—";

  if (editor.value.length > maxPreviewLength) {
    codeBlock.innerHTML = `<i>Conteúdo muito grande para exibir preview (mais de ${maxPreviewLength} caracteres).</i>`;
  } else {
    const html = highlightText(lang, editor.value || " ");
    codeBlock.innerHTML = html;
  }
}

// Copiar para a área de transferência
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(editor.value);
    alert("Copiado para a área de transferência.");
  } catch {
    prompt("Copiar manualmente:", editor.value);
  }
}

// Download do conteúdo
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

// Atualiza editor e preview com dados (obj = {title, lang, content})
function loadData(obj) {
  if (!obj) return;
  titleInput.value = obj.title || "";
  langSelect.value = obj.lang || "auto";
  editor.value = obj.content || "";
  renderPreview();
}

// Salva dados no localStorage se 'local' selecionado
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

// Carrega dados do localStorage
function loadFromLocalStorage() {
  const raw = localStorage.getItem("kitsune_paste_data");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Eventos
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

// Botão Salvar & Gerar Link
$("saveBtn").addEventListener("click", () => {
  const data = {
    title: titleInput.value,
    lang: langSelect.value,
    content: editor.value,
  };
  setHashFromData(data);
  alert("Link gerado! Copie a URL para compartilhar.");
});

// Botão Abrir Script RAW
$("rawBtn").addEventListener("click", () => {
  const content = editor.value;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
});

// Botão Copiar
$("copyBtn").addEventListener("click", () => {
  copyToClipboard();
});

// Botão Download
$("downloadBtn").addEventListener("click", () => {
  let ext = "txt";
  const lang = langSelect.value;
  switch (lang) {
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

// Botão Limpar
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

// Botão Alternar Tema (escuro/claro)
$("themeBtn").addEventListener("click", () => {
  if (document.documentElement.style.getPropertyValue("--bg") === "#0b0e0f") {
    // Muda para tema claro
    document.documentElement.style.setProperty("--bg", "#fff");
    document.documentElement.style.setProperty("--panel", "#f0f0f0");
    document.documentElement.style.setProperty("--muted", "#666");
    document.documentElement.style.setProperty("--accent", "#2dd36f");
    document.documentElement.style.setProperty("--danger", "#ff6b6b");
    document.documentElement.style.setProperty("--glass", "rgba(0,0,0,0.05)");
    document.body.style.color = "#222";
  } else {
    // Muda para tema escuro
    document.documentElement.style.setProperty("--bg", "#0b0e0f");
    document.documentElement.style.setProperty("--panel", "#0f1515");
    document.documentElement.style.setProperty("--muted", "#98a3a3");
    document.documentElement.style.setProperty("--accent", "#2dd36f");
    document.documentElement.style.setProperty("--danger", "#ff6b6b");
    document.documentElement.style.setProperty("--glass", "rgba(255,255,255,0.03)");
    document.body.style.color = "#dfeeea";
  }
});

// Inicialização da página
window.addEventListener("load", () => {
  // Tenta carregar dados da URL hash primeiro
  const hashData = readDataFromHash();
  if (hashData) {
    loadData(hashData);
  } else {
    // Se não tiver hash, carrega do localStorage
    const localData = loadFromLocalStorage();
    if (localData) {
      loadData(localData);
      expansionSelect.value = "local";
    }
  }
  updateHashInfo();
  renderPreview();
});
