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

async function generate() {
  const btn     = document.getElementById('btnGenerate');
  const btnText = document.getElementById('btnText');
  const btnLoad = document.getElementById('btnLoading');

  btn.disabled = true;
  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');

  // Switch to result section
  switchSection('resultado');

  const container = document.getElementById('resultado-content');
  container.innerHTML = `
    <div class="progress-bar"><div class="progress-fill"></div></div>
    <div class="output-streaming" id="streamOutput"></div>
  `;

  const streamOutput = document.getElementById('streamOutput');
  streamOutput.innerHTML = '<span class="cursor"></span>';

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

    const reader = resp.body.getReader();
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
          renderResult(fullText, container);
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
        } catch (parseErr) {
          if (parseErr.message !== 'Unexpected token') throw parseErr;
        }
      }
    }

    if (fullText) renderResult(fullText, container);

  } catch (err) {
    container.innerHTML = `
      <div class="result-block">
        <div class="result-block-header">
          <span class="result-block-title">⚠️ Erro</span>
        </div>
        <div class="result-block-content">${escapeHtml(err.message)}</div>
      </div>`;
  } finally {
    btn.disabled = false;
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
  }
}

// ── RENDER RESULT ─────────────────────────────────────────────────────
function renderResult(text, container) {
  // Split into logical blocks by separator lines or major headings
  const blocks = splitIntoBlocks(text);

  let html = '';
  for (const block of blocks) {
    if (!block.content.trim()) continue;
    html += `
      <div class="result-block">
        <div class="result-block-header">
          <span class="result-block-title">${escapeHtml(block.title)}</span>
          <button class="copy-btn" onclick="copyBlock(this)">Copiar</button>
        </div>
        <div class="result-block-content">${renderMarkdown(block.content.trim())}</div>
      </div>`;
  }

  if (!html) {
    html = `
      <div class="result-block">
        <div class="result-block-header">
          <span class="result-block-title">✦ Conteúdo Gerado</span>
          <button class="copy-btn" onclick="copyBlock(this)">Copiar tudo</button>
        </div>
        <div class="result-block-content">${renderMarkdown(text.trim())}</div>
      </div>`;
  }

  container.innerHTML = html;
}

function splitIntoBlocks(text) {
  // Try to find separator patterns like === SLIDE === or ## HEADING
  const separators = [
    /^={3,}\s*(.+?)\s*={3,}$/m,
    /^-{3,}\s*(.+?)\s*-{3,}$/m,
  ];

  let blocks = [];

  // Try separator-based split
  const sepRegex = /={3,}.+?={3,}/g;
  const matches = [...text.matchAll(/={3,}\s*(.+?)\s*={3,}/g)];

  if (matches.length >= 2) {
    let lastIndex = 0;
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const nextStart = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const content = text.slice(m.index + m[0].length, nextStart).trim();
      if (content) {
        blocks.push({ title: m[1].trim(), content });
      }
      lastIndex = nextStart;
    }
    if (blocks.length > 0) return blocks;
  }

  // Fallback: split by ## headings
  const h2 = text.split(/\n(?=#{1,3} )/);
  if (h2.length > 1) {
    return h2.map(chunk => {
      const firstLine = chunk.split('\n')[0].replace(/^#+\s*/, '').trim();
      const content = chunk.split('\n').slice(1).join('\n').trim();
      return { title: firstLine || '✦', content: content || chunk.trim() };
    }).filter(b => b.content);
  }

  // Last resort: single block
  return [{ title: '✦ Conteúdo Gerado', content: text }];
}

function renderMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── COPY ─────────────────────────────────────────────────────────────
function copyBlock(btn) {
  const content = btn.closest('.result-block').querySelector('.result-block-content').innerText;
  navigator.clipboard.writeText(content).then(() => {
    btn.textContent = '✓ Copiado!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copiar';
      btn.classList.remove('copied');
    }, 2000);
  });
}
