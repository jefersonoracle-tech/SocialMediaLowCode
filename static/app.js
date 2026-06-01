// ── NAV ──────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.section;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`section-${target}`).classList.add('active');
  });
});

document.getElementById('btnNovo').addEventListener('click', () => {
  switchSection('briefing');
});

function switchSection(name) {
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.section === name);
  });
  document.querySelectorAll('.section').forEach(s => {
    s.classList.toggle('active', s.id === `section-${name}`);
  });
}

// ── UPLOAD ───────────────────────────────────────────────────────────
let uploadedImage = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput  = document.getElementById('fileInput');
const placeholder = document.getElementById('uploadPlaceholder');
const preview    = document.getElementById('uploadPreview');
const previewImg = document.getElementById('previewImg');

document.getElementById('uploadBtn').addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('click', (e) => {
  if (e.target === uploadArea) fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadImage(fileInput.files[0]);
});

uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));

uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) loadImage(e.dataTransfer.files[0]);
});

document.getElementById('removeImg').addEventListener('click', e => {
  e.stopPropagation();
  uploadedImage = null;
  previewImg.src = '';
  placeholder.classList.remove('hidden');
  preview.classList.add('hidden');
  fileInput.value = '';
});

function loadImage(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    uploadedImage = ev.target.result;
    previewImg.src = uploadedImage;
    placeholder.classList.add('hidden');
    preview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

// ── BUSCAR TEMAS ─────────────────────────────────────────────────────
document.getElementById('btnBuscarTema').addEventListener('click', buscarTemas);

async function buscarTemas() {
  const nicho   = document.getElementById('nicho').value.trim();
  const publico = document.getElementById('publico').value.trim();
  const objetivo = document.getElementById('objetivo').value.trim();

  if (!nicho) {
    document.getElementById('nicho').focus();
    return;
  }
  if (!publico) {
    document.getElementById('publico').focus();
    return;
  }
  if (!objetivo) {
    document.getElementById('objetivo').focus();
    return;
  }

  const btn  = document.getElementById('btnBuscarTema');
  const txt  = document.getElementById('btnBuscarText');
  const load = document.getElementById('btnBuscarLoading');

  btn.disabled = true;
  txt.classList.add('hidden');
  load.classList.remove('hidden');

  // Limpa seleção anterior e mostra skeleton
  document.getElementById('temaSelecionado').value = '';
  const temasContainer = document.getElementById('temasContainer');
  const temasList = document.getElementById('temasList');
  temasList.innerHTML = `
    <div class="temas-skeleton">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>`;
  temasContainer.classList.remove('hidden');

  try {
    const resp = await fetch('/api/buscar-temas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nicho, publico, objetivo }),
    });

    const data = await resp.json();

    if (data.error) throw new Error(data.error);
    if (!data.temas || !data.temas.length) throw new Error('Nenhum tema encontrado.');

    renderTemas(data.temas);

  } catch (err) {
    temasList.innerHTML = `<div style="color:#ef4444;font-size:13px;padding:12px 0">⚠️ ${escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    txt.classList.remove('hidden');
    load.classList.add('hidden');
  }
}

function renderTemas(temas) {
  const list = document.getElementById('temasList');
  list.innerHTML = '';

  let autoSelectCard = null;
  let autoSelectTema = null;

  temas.forEach((tema, i) => {
    const isRec = tema.recomendado === true;
    const card = document.createElement('div');
    card.className = 'tema-card' + (isRec ? ' recomendado' : '');
    card.innerHTML = `
      <span class="tema-rank" style="${isRec ? 'background:rgba(245,158,11,0.2);color:#f59e0b' : ''}">${i + 1}</span>
      <div class="tema-info">
        ${isRec ? '<div class="badge-recomendado">⭐ Recomendado para você</div>' : ''}
        <div class="tema-titulo">${escapeHtml(tema.titulo)}</div>
        <div class="tema-descricao">${escapeHtml(tema.descricao)}</div>
        <div class="tema-angulo">✦ ${escapeHtml(tema.angulo)}</div>
      </div>
      <span class="tema-check">✓</span>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.tema-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      setTemaSelecionado(`${tema.titulo} — ${tema.angulo}`);
    });

    list.appendChild(card);

    if (isRec) { autoSelectCard = card; autoSelectTema = tema; }
  });

  // Auto-seleciona o recomendado
  if (autoSelectCard) {
    autoSelectCard.classList.add('selected');
    setTemaSelecionado(`${autoSelectTema.titulo} — ${autoSelectTema.angulo}`);
    autoSelectCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Dica de refinamento
  const nichoVal  = document.getElementById('nicho').value.trim();
  const objVal    = document.getElementById('objetivo').value.trim();
  const dicaEl    = document.getElementById('dicaRefinamento');
  if (dicaEl) dicaEl.remove();
  list.insertAdjacentHTML('afterend', buildDicaRefinamento(nichoVal, objVal));
}

function buildDicaRefinamento(nicho, objetivo) {
  const exemplos = gerarExemplosRefinamento(nicho, objetivo);
  return `
    <div class="dica-refinamento" id="dicaRefinamento">
      <div class="dica-header">
        <span class="dica-icon">💡</span>
        <span class="dica-titulo">Quer refinar a pesquisa?</span>
      </div>
      <p class="dica-texto">Seja mais específico no campo <strong>Nicho / Tema</strong> para encontrar temas mais cirúrgicos. Exemplos para <em>${escapeHtml(nicho)}</em>:</p>
      <div class="dica-exemplos">
        ${exemplos.map(ex => `<button type="button" class="dica-chip" onclick="aplicarRefinamento('${escapeHtml(ex)}')">${escapeHtml(ex)}</button>`).join('')}
      </div>
    </div>`;
}

function gerarExemplosRefinamento(nicho, objetivo) {
  const n = nicho.toLowerCase();
  const exemplos = {
    futebol:           ['futebol tático', 'futebol feminino', 'futebol base / categorias de acesso', 'arbitragem no futebol', 'preparação física no futebol'],
    marketing:         ['marketing de conteúdo', 'tráfego pago para iniciantes', 'copywriting para Instagram', 'funil de vendas orgânico'],
    nutrição:          ['nutrição esportiva', 'nutrição infantil', 'alimentação plant-based', 'nutrição para emagrecimento'],
    fitness:           ['treino para iniciantes', 'hipertrofia muscular', 'treino feminino', 'crossfit para iniciantes'],
    finanças:          ['finanças pessoais', 'investimentos para iniciantes', 'renda extra', 'controle de gastos'],
    tecnologia:        ['inteligência artificial', 'programação para iniciantes', 'segurança digital', 'automação de tarefas'],
    empreendedorismo:  ['empreendedorismo digital', 'gestão de pequenas empresas', 'vendas online', 'produtividade para empreendedores'],
  };

  for (const [key, sugestoes] of Object.entries(exemplos)) {
    if (n.includes(key)) return sugestoes;
  }

  // Genérico quando não há match
  return [
    `${nicho} para iniciantes`,
    `${nicho} avançado`,
    `tendências de ${nicho} em 2025`,
    `erros comuns em ${nicho}`,
    `${nicho} na prática`,
  ];
}

function aplicarRefinamento(texto) {
  document.getElementById('nicho').value = texto;
  // Limpa temas anteriores e dica
  document.getElementById('temasList').innerHTML = '';
  const dica = document.getElementById('dicaRefinamento');
  if (dica) dica.remove();
  document.getElementById('temasContainer').classList.add('hidden');
  setTemaSelecionado('');
}

function setTemaSelecionado(valor) {
  document.getElementById('temaSelecionado').value = valor;
  const hasTheme = valor.trim().length > 0;
  const lockedCards = ['card-referencia', 'card-perfil', 'card-formato', 'card-paleta', 'card-obs'];
  lockedCards.forEach(id => {
    const card = document.getElementById(id);
    if (hasTheme) {
      card.classList.add('card-unlocked');
    } else {
      card.classList.remove('card-unlocked');
    }
  });
  document.getElementById('btnGenerate').disabled = !hasTheme;
}

// ── FORMATO ──────────────────────────────────────────────────────────
document.querySelectorAll('input[name="formato"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const slidesField = document.getElementById('slidesField');
    slidesField.classList.toggle('hidden', radio.value !== 'Carrossel');
  });
});

// ── FORM ─────────────────────────────────────────────────────────────
document.getElementById('briefingForm').addEventListener('submit', async e => {
  e.preventDefault();
  await generate();
});

function buildBriefing() {
  const v = id => document.getElementById(id).value.trim();
  const formato        = document.querySelector('input[name="formato"]:checked').value;
  const paleta         = document.querySelector('input[name="paleta"]:checked').value;
  const handle         = v('handle');
  const nicho          = v('nicho');
  const publico        = v('publico');
  const objetivo       = v('objetivo');
  const tom            = v('tom');
  const linha          = v('linha');
  const temaSelecionado = v('temaSelecionado');
  const obs            = v('observacoes');
  const numSlides      = v('numSlides');

  let msg = `BRIEFING COMPLETO (pule as FASES 2 e 3 — tema já definido — execute direto FASES 4 e 5):\n`;
  msg += `- @ do Instagram: @${handle.replace(/^@/, '')}\n`;
  msg += `- Nicho/Tema: ${nicho}\n`;
  msg += `- Público-alvo: ${publico}\n`;
  if (objetivo)  msg += `- Objetivo: ${objetivo}\n`;
  if (tom)       msg += `- Tom de voz: ${tom}\n`;
  if (linha)          msg += `- Linha editorial: ${linha}\n`;
  if (temaSelecionado) msg += `- Tema do post (já definido, use exatamente este): ${temaSelecionado}\n`;
  msg += `- Paleta tonal: ${paleta}\n`;
  msg += `- Formato: ${formato}`;
  if (formato === 'Carrossel' && numSlides) msg += ` com ${numSlides} slides`;
  msg += '\n';
  if (obs) msg += `- Observações: ${obs}\n`;

  if (uploadedImage) {
    msg += `\nArquivo de referência visual enviado em anexo. Use-o para extrair o DNA editorial do perfil (FASE 1.5) e pule direto para FASE 2.\n`;
  }

  msg += `\nAgora execute as FASES 2, 3, 4 e 5 silenciosamente e entregue o resultado final completo.`;

  return msg;
}

// ── POST PREVIEW STATE ────────────────────────────────────────────────
let parsedSlides = [];
let currentSlideIdx = 0;

async function generate() {
  const btn     = document.getElementById('btnGenerate');
  const btnText = document.getElementById('btnText');
  const btnLoad = document.getElementById('btnLoading');

  btn.disabled = true;
  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');

  switchSection('resultado');

  // Show streaming state
  const emptyState   = document.getElementById('emptyState');
  const resultLayout = document.getElementById('resultLayout');
  const streamDiv    = document.getElementById('resultado-stream');

  resultLayout.classList.add('hidden');
  emptyState.classList.add('hidden');
  streamDiv.innerHTML = `<div class="output-streaming" id="streamOutput"><span class="cursor"></span></div>`;

  const streamOutput = document.getElementById('streamOutput');
  let fullText = '';

  try {
    const payload = { briefing: buildBriefing() };
    if (uploadedImage) payload.image = uploadedImage;

    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || `HTTP ${resp.status}`);
    }

    const reader  = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') {
          renderResult(fullText);
          return;
        }
        try {
          const data = JSON.parse(raw);
          if (data.error) throw new Error(data.error);
          if (data.text) {
            fullText += data.text;
            streamOutput.innerHTML = escapeHtml(fullText) + '<span class="cursor"></span>';
            streamOutput.scrollTop = streamOutput.scrollHeight;
          }
        } catch (parseErr) { /* ignore partial JSON */ }
      }
    }

    if (fullText) renderResult(fullText);

  } catch (err) {
    streamDiv.innerHTML = `<div class="empty-state"><span>⚠️</span><p>${escapeHtml(err.message)}</p></div>`;
  } finally {
    btn.disabled = false;
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
  }
}

// ── PARSE RESULT ──────────────────────────────────────────────────────
function parseResult(text) {
  const slides = [];

  // Split by slide separators: ========== SLIDE - NAME ==========
  const slidePattern = /={3,}\s*SLIDE\s*[-–]?\s*([^\n=]+?)\s*={3,}/gi;
  const slideMatches = [...text.matchAll(slidePattern)];

  if (slideMatches.length === 0) {
    // No slide markers — treat entire text as one slide
    slides.push(extractSlideContent('Slide 1', text));
  } else {
    for (let i = 0; i < slideMatches.length; i++) {
      const m     = slideMatches[i];
      const end   = i + 1 < slideMatches.length ? slideMatches[i + 1].index : text.length;
      const chunk = text.slice(m.index + m[0].length, end);
      slides.push(extractSlideContent(m[1].trim(), chunk));
    }
  }

  // Extract global sections (after all slides)
  const legenda     = extractTag(text, 'LEGENDA');
  const trilha      = extractTag(text, 'TRILHA_SONORA');

  return { slides, legenda, trilha };
}

function extractSlideContent(name, chunk) {
  const promptImagem = extractTag(chunk, 'PROMPT_IMAGEM');
  const textoOverlay = extractTag(chunk, 'TEXTO_OVERLAY');

  let titulo    = '';
  let subtitulo = '';
  let badge     = '';

  if (textoOverlay) {
    const tMatch = textoOverlay.match(/TÍTULO\s*:\s*(.+)/i);
    const sMatch = textoOverlay.match(/SUBTÍTULO\s*:\s*(.+)/i);
    const bMatch = textoOverlay.match(/BADGE\s*:\s*(.+)/i);
    if (tMatch) titulo    = tMatch[1].trim();
    if (sMatch) subtitulo = sMatch[1].trim();
    if (bMatch) badge     = bMatch[1].trim();
  }

  return { name, promptImagem, titulo, subtitulo, badge };
}

function extractTag(text, tag) {
  const re = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i');
  const m  = text.match(re);
  return m ? m[1].trim() : '';
}

// ── RENDER RESULT ─────────────────────────────────────────────────────
function renderResult(text) {
  const parsed  = parseResult(text);
  parsedSlides  = parsed.slides;
  currentSlideIdx = 0;

  const formato = document.querySelector('input[name="formato"]:checked').value;

  // Set aspect ratio
  const postContainer = document.getElementById('postContainer');
  postContainer.classList.remove('ratio-45', 'ratio-916');
  postContainer.classList.add(['Story', 'Reels'].includes(formato) ? 'ratio-916' : 'ratio-45');

  // Slide tabs
  const slideTabs = document.getElementById('slideTabs');
  slideTabs.innerHTML = '';
  if (parsedSlides.length > 1) {
    parsedSlides.forEach((slide, i) => {
      const tab = document.createElement('button');
      tab.className = 'slide-tab' + (i === 0 ? ' active' : '');
      tab.textContent = slide.name;
      tab.addEventListener('click', () => switchSlide(i));
      slideTabs.appendChild(tab);
    });
    slideTabs.classList.remove('hidden');
  } else {
    slideTabs.classList.add('hidden');
  }

  // Prompts panel
  renderPromptsPanel(parsed);

  // Show layout, hide streaming
  document.getElementById('resultado-stream').innerHTML = '';
  document.getElementById('resultLayout').classList.remove('hidden');

  // Load first slide
  loadSlide(0);

  // Wire controls (only once via flag)
  if (!window._controlsWired) {
    wireControls();
    window._controlsWired = true;
  }
}

function switchSlide(idx) {
  currentSlideIdx = idx;
  document.querySelectorAll('.slide-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  loadSlide(idx);
}

function loadSlide(idx) {
  const slide = parsedSlides[idx];
  if (!slide) return;

  document.getElementById('overlayBadge').textContent    = slide.badge    || '';
  document.getElementById('overlayTitulo').textContent   = slide.titulo   || '';
  document.getElementById('overlaySubtitulo').textContent = slide.subtitulo || '';

  // Reset bg image for new slide (keep if same session image)
  // (user manages image per-slide manually)
}

function renderPromptsPanel(parsed) {
  const panel = document.getElementById('promptsPanel');
  let html = '';

  parsed.slides.forEach((slide, i) => {
    if (slide.promptImagem) {
      html += promptBlock(`🖼️ Prompt Imagem — ${slide.name}`, slide.promptImagem);
    }
  });

  if (parsed.legenda) {
    html += promptBlock('📝 Legenda', parsed.legenda);
  }
  if (parsed.trilha) {
    html += promptBlock('🎵 Trilha Sonora', parsed.trilha);
  }

  panel.innerHTML = html;
}

function promptBlock(title, content) {
  return `
    <div class="prompt-block">
      <div class="prompt-block-header">
        <span class="prompt-block-title">${escapeHtml(title)}</span>
        <button class="copy-btn" onclick="copyPromptBlock(this)">Copiar</button>
      </div>
      <div class="prompt-block-content">${escapeHtml(content)}</div>
    </div>`;
}

// ── BG IMAGE UPLOAD (result tab) ──────────────────────────────────────
const imageDrop    = document.getElementById('imageDrop');
const bgImageInput = document.getElementById('bgImageInput');
const bgImg        = document.getElementById('bgImg');

imageDrop.addEventListener('click', () => bgImageInput.click());

imageDrop.addEventListener('dragover', e => {
  e.preventDefault();
  imageDrop.classList.add('drag-over');
});
imageDrop.addEventListener('dragleave', () => imageDrop.classList.remove('drag-over'));
imageDrop.addEventListener('drop', e => {
  e.preventDefault();
  imageDrop.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) loadBgImage(e.dataTransfer.files[0]);
});

bgImageInput.addEventListener('change', () => {
  if (bgImageInput.files[0]) loadBgImage(bgImageInput.files[0]);
});

function loadBgImage(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    bgImg.src = ev.target.result;
    bgImg.style.display = 'block';
    imageDrop.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// ── CONTROLS ──────────────────────────────────────────────────────────
function wireControls() {
  // Font size
  const ctrlFontSize    = document.getElementById('ctrlFontSize');
  const ctrlFontSizeVal = document.getElementById('ctrlFontSizeVal');
  ctrlFontSize.addEventListener('input', () => {
    const px = ctrlFontSize.value + 'px';
    ctrlFontSizeVal.textContent = px;
    document.getElementById('overlayInner').style.fontSize = px;
  });

  // Text color
  const ctrlColor    = document.getElementById('ctrlColor');
  const ctrlColorVal = document.getElementById('ctrlColorVal');
  ctrlColor.addEventListener('input', () => {
    ctrlColorVal.textContent = ctrlColor.value;
    document.getElementById('overlayInner').style.color = ctrlColor.value;
  });

  // Alignment
  document.querySelectorAll('[data-align]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-align]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('overlayInner').style.textAlign = btn.dataset.align;
    });
  });

  // Vertical position
  document.querySelectorAll('[data-valign]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-valign]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('layerText').style.alignItems = btn.dataset.valign;
    });
  });

  // Bold
  const ctrlBold = document.getElementById('ctrlBold');
  ctrlBold.addEventListener('click', () => {
    ctrlBold.classList.toggle('active');
    const inner = document.getElementById('overlayInner');
    inner.style.fontWeight = ctrlBold.classList.contains('active') ? 'bold' : 'normal';
  });

  // Bg opacity
  const ctrlBgOpacity    = document.getElementById('ctrlBgOpacity');
  const ctrlBgOpacityVal = document.getElementById('ctrlBgOpacityVal');
  ctrlBgOpacity.addEventListener('input', () => {
    ctrlBgOpacityVal.textContent = ctrlBgOpacity.value + '%';
    applyOverlayBg();
  });

  // Bg color
  const ctrlBgColor    = document.getElementById('ctrlBgColor');
  const ctrlBgColorVal = document.getElementById('ctrlBgColorVal');
  ctrlBgColor.addEventListener('input', () => {
    ctrlBgColorVal.textContent = ctrlBgColor.value;
    applyOverlayBg();
  });
}

function applyOverlayBg() {
  const opacity = parseInt(document.getElementById('ctrlBgOpacity').value) / 100;
  const color   = document.getElementById('ctrlBgColor').value;
  const r = parseInt(color.slice(1,3), 16);
  const g = parseInt(color.slice(3,5), 16);
  const b = parseInt(color.slice(5,7), 16);
  document.getElementById('overlayInner').style.backgroundColor = `rgba(${r},${g},${b},${opacity})`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── COPY ─────────────────────────────────────────────────────────────
function copyPromptBlock(btn) {
  const content = btn.closest('.prompt-block').querySelector('.prompt-block-content').innerText;
  navigator.clipboard.writeText(content).then(() => {
    btn.textContent = '✓ Copiado!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('copied'); }, 2000);
  });
}
