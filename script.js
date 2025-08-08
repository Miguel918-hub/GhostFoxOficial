// Salvar automaticamente no localStorage quando o usuário editar
function saveToLocal() {
  const data = {
    title: titleInput.value,
    lang: langSelect.value,
    content: editor.value,
    savedAt: Date.now(),
  };
  localStorage.setItem('kitsune-paste-data', JSON.stringify(data));
}

// Carregar do localStorage ao abrir o site
function loadFromLocal() {
  const saved = localStorage.getItem('kitsune-paste-data');
  if (!saved) return false;
  try {
    const data = JSON.parse(saved);
    titleInput.value = data.title || '';
    langSelect.value = data.lang || 'auto';
    editor.value = data.content || '';
    renderPreview();
    updateHashInfo();
    return true;
  } catch {
    return false;
  }
}

editor.addEventListener('input', saveToLocal);
titleInput.addEventListener('input', saveToLocal);
langSelect.addEventListener('change', saveToLocal);

// Na inicialização, tenta carregar do localStorage antes de hash
if (!loadFromHash()) {
  loadFromLocal();
}
