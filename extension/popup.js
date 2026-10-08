const $ = id => document.getElementById(id);
const status = msg => { $('status').textContent = msg; };

function extrairDadosPagina() {
  const txt = el => el?.innerText?.trim() || el?.value?.trim() || '';
  const input = name => document.querySelector(`input[name="${name}"]`);
  const unidade = txt(input('unidadeSaude')) || txt(document.querySelector('[data-unidade-saude], .unidade-saude'));
  const equipe = txt(input('equipe')) || txt(document.querySelector('[data-equipe], .equipe'));
  const tabs = [...document.querySelectorAll('[role="tab"], mat-tab-header [role="tab"], button')]
    .map(el => txt(el)).filter(Boolean);
  const microareas = [...new Set(tabs.filter(t => /^(microárea\s*)?\d{1,3}(\s*\(\d+\))?$/i.test(t) || /fora de área/i.test(t)))];
  return { unidade, equipe, microareas };
}

function normalizarMicroarea(v) {
  return String(v || '').replace(/^microárea\s*/i, '').replace(/\s*\(\d+\)\s*$/, '').trim();
}

function selecionarMicroarea(label) {
  const alvoValor = normalizarMicroarea(label);
  const tabs = [...document.querySelectorAll('[role="tab"], mat-tab-header [role="tab"], button')];
  const alvo = tabs.find(el => normalizarMicroarea(el.innerText || el.textContent) === alvoValor);
  if (alvo) { alvo.click(); return true; }
  return false;
}

function texto(el) { return (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim(); }

function extrairTelefone(textoLinha) {
  const m = textoLinha.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\d{4}|\d{4})[-.\s]?\d{4}/g);
  return m ? [...new Set(m.map(x => x.trim()))].join(' / ') : '';
}

function extrairDataVisita(textoLinha) {
  const m = textoLinha.match(/(?:última\s+visita|ultima\s+visita|último\s+atendimento|ultimo\s+atendimento|visita|atendimento)[^\d]{0,35}(\d{2}[\/.]\d{2}[\/.]\d{4})/i);
  return m?.[1] || '';
}

function encontrarContainer(a) {
  return a.closest('tr,[role="row"],[data-testid*="row" i],li,article,.card,.mat-mdc-list-item,.mat-list-item,.cdk-virtual-scroll-content-wrapper') || a.parentElement;
}

function extrairLinksDaPagina(contexto) {
  const links = [...document.querySelectorAll('a[href]')];
  const padroes = [
    /\/cidadao(?:\/|\?|$)/i, /\/paciente(?:\/|\?|$)/i, /\/familia(?:\/|\?|$)/i,
    /\/domicilio(?:\/|\?|$)/i, /\/imovel\//i, /\/cadastro[^/]*(?:individual|cidadao)/i
  ];
  const candidatos = links.filter(a => padroes.some(r => r.test(a.getAttribute('href') || '')));
  return candidatos.map(a => {
    const href = new URL(a.getAttribute('href'), location.href).href;
    const box = encontrarContainer(a);
    const linha = texto(box || a);
    const nome = texto(a) || linha.split(' - ')[0] || linha;
    const cpf = (linha.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/) || [])[0] || '';
    const cns = (linha.match(/\b\d{3}\s?\d{4}\s?\d{4}\s?\d{4}\b/) || [])[0] || '';
    return {
      chave_externa: href,
      pec_url: href,
      nome_paciente: nome,
      cns,
      cpf,
      telefone: extrairTelefone(linha),
      ultima_visita: extrairDataVisita(linha),
      equipe: contexto.equipe,
      microarea: contexto.microarea,
      unidade: contexto.unidade,
      endereco: linha
    };
  });
}

function estadoPaginacao() {
  const candidatos = [...document.querySelectorAll('button,a,[role="button"],mat-select,select')];
  const next = candidatos.find(el => {
    const t = texto(el).toLowerCase();
    const label = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`.toLowerCase();
    return /^(próxima|proxima|next|›|»)$/.test(t) || /próxima página|proxima pagina|next page/.test(label);
  });
  const disabled = next && (next.disabled || next.getAttribute('aria-disabled') === 'true' || next.classList.contains('disabled'));
  return { next, disabled };
}

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

async function estabilizarLista() {
  let anterior = -1;
  let estavel = 0;
  for (let i = 0; i < 14; i++) {
    const altura = document.documentElement.scrollHeight;
    window.scrollTo(0, altura);
    await esperar(350);
    const atual = document.documentElement.scrollHeight;
    if (atual === anterior) estavel++; else estavel = 0;
    anterior = atual;
    if (estavel >= 2) break;
  }
  window.scrollTo(0, 0);
  await esperar(200);
}

async function tentarSelecionarMaiorPagina() {
  const selects = [...document.querySelectorAll('select')];
  for (const s of selects) {
    const opcoes = [...s.options];
    const alvo = opcoes.find(o => /todos|all/i.test(o.text)) || opcoes.filter(o => /^\d+$/.test(o.value) || /^\d+$/.test(o.text.trim())).sort((a,b) => Number(b.value || b.text) - Number(a.value || a.text))[0];
    if (alvo && s.value !== alvo.value) {
      s.value = alvo.value;
      s.dispatchEvent(new Event('change', { bubbles: true }));
      await esperar(900);
      return true;
    }
  }
  return false;
}

async function coletarPaginasDaMicroarea(contexto, limitePaginas = 500) {
  const todos = new Map();
  let paginas = 0;
  let semMudanca = 0;
  let assinaturaAnterior = '';
  await estabilizarLista();
  await tentarSelecionarMaiorPagina();

  for (; paginas < limitePaginas; paginas++) {
    await estabilizarLista();
    const itens = extrairLinksDaPagina(contexto);
    const assinatura = itens.map(x => x.chave_externa).sort().join('|');
    const tamanhoAntes = todos.size;
    itens.forEach(x => todos.set(x.chave_externa, x));
    if (todos.size === tamanhoAntes && assinatura === assinaturaAnterior) semMudanca++; else semMudanca = 0;
    assinaturaAnterior = assinatura;

    const { next, disabled } = estadoPaginacao();
    if (!next || disabled || semMudanca >= 2) break;
    const antes = assinatura;
    next.scrollIntoView({ block: 'center' });
    next.click();
    await esperar(900);
    let mudou = false;
    for (let i = 0; i < 8; i++) {
      await esperar(350);
      const agora = extrairLinksDaPagina(contexto).map(x => x.chave_externa).sort().join('|');
      if (agora && agora !== antes) { mudou = true; break; }
    }
    if (!mudou) break;
  }
  return { itens: [...todos.values()], paginas };
}

async function coletarMicroareas(selecionadas, contexto) {
  const todos = new Map();
  const relatorio = [];
  for (const microarea of selecionadas) {
    const ok = selecionarMicroarea(microarea);
    if (!ok) { relatorio.push({ microarea, registros: 0, paginas: 0, erro: 'Microárea não localizada' }); continue; }
    await esperar(900);
    const r = await coletarPaginasDaMicroarea({ ...contexto, microarea });
    r.itens.forEach(x => todos.set(x.chave_externa, x));
    relatorio.push({ microarea, registros: r.itens.length, paginas: r.paginas + 1 });
  }
  return { itens: [...todos.values()], relatorio };
}

async function executar() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { status('Nenhuma aba ativa.'); return; }
  const selecionadas = [...document.querySelectorAll('input[name="microarea"]:checked')].map(x => x.value);
  if (!selecionadas.length) { status('Selecione ao menos uma microárea.'); return; }
  $('btnGerar').disabled = true;
  status('Iniciando varredura completa…');
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (sel, contexto) => {
        const texto = el => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
        const normalizar = v => String(v || '').replace(/^microárea\s*/i, '').replace(/\s*\(\d+\)\s*$/, '').trim();
        const esperar = ms => new Promise(r => setTimeout(r, ms));
        const telefone = s => { const m = String(s || '').match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\d{4}|\d{4})[-.\s]?\d{4}/g); return m ? [...new Set(m.map(x => x.trim()))].join(' / ') : ''; };
        const visita = s => (String(s || '').match(/(?:última\s+visita|ultima\s+visita|último\s+atendimento|ultimo\s+atendimento|visita|atendimento)[^\d]{0,35}(\d{2}[\/.]\d{2}[\/.]\d{4})/i) || [])[1] || '';
        const linksPac = a => { const h=a.getAttribute('href')||''; return /\/(?:cidadao|paciente|familia|domicilio)(?:\/|\?|$)/i.test(h) || /\/imovel\//i.test(h) || /\/cadastro[^/]*(?:individual|cidadao)/i.test(h); };
        const extrairDOM = micro => [...document.querySelectorAll('a[href]')].filter(linksPac).map(a => {
          const href = new URL(a.getAttribute('href'), location.href).href;
          const box = a.closest('tr,[role="row"],[data-testid*="row" i],li,article,.card,.mat-mdc-list-item,.mat-list-item') || a.parentElement;
          const linha = texto(box || a);
          return { chave_externa: href, pec_url: href, nome_paciente: texto(a) || linha.split(' - ')[0] || linha, cns:(linha.match(/\b\d{3}\s?\d{4}\s?\d{4}\s?\d{4}\b/)||[])[0]||'', cpf:(linha.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/)||[])[0]||'', telefone:telefone(linha), ultima_visita:visita(linha), equipe:contexto.equipe, microarea:micro, unidade:contexto.unidade, endereco:linha };
        });
        const selecionar = label => { const alvo=normalizar(label); const els=[...document.querySelectorAll('[role="tab"],mat-tab-header [role="tab"],button')]; const el=els.find(x=>normalizar(x.innerText||x.textContent)===alvo); if(el){el.click();return true;} return false; };
        const estabilizar = async () => { let ant=-1, est=0; for(let i=0;i<12;i++){ const h=document.documentElement.scrollHeight; window.scrollTo(0,h); await esperar(300); const a=document.documentElement.scrollHeight; if(a===ant)est++;else est=0; ant=a; if(est>=2)break;} window.scrollTo(0,0); await esperar(150); };
        const maiorPagina = async () => { for(const s of [...document.querySelectorAll('select')]){ const op=[...s.options]; const alvo=op.find(o=>/todos|all/i.test(o.text))||op.filter(o=>/^\d+$/.test(o.value)||/^\d+$/.test(o.text.trim())).sort((a,b)=>Number(b.value||b.text)-Number(a.value||a.text))[0]; if(alvo&&s.value!==alvo.value){s.value=alvo.value;s.dispatchEvent(new Event('change',{bubbles:true}));await esperar(900);return true;} } return false; };
        const nextInfo = () => { const els=[...document.querySelectorAll('button,a,[role="button"]')]; const next=els.find(el=>{const t=texto(el).toLowerCase();const l=`${el.getAttribute('aria-label')||''} ${el.getAttribute('title')||''}`.toLowerCase();return /^(próxima|proxima|next|›|»)$/.test(t)||/próxima página|proxima pagina|next page/.test(l);}); return {next,disabled:!!next&&(next.disabled||next.getAttribute('aria-disabled')==='true'||next.classList.contains('disabled'))}; };

        // Captura respostas JSON que o próprio PEC carregar enquanto trocamos as microáreas.
        const respostas = [];
        const fetch0 = window.fetch;
        window.__inqueritoRespostas = respostas;
        if (!window.__inqueritoFetchHook) {
          window.__inqueritoFetchHook = true;
          window.fetch = async (...args) => { const r=await fetch0(...args); try{ const u=typeof args[0]==='string'?args[0]:args[0]?.url||''; const ct=r.headers.get('content-type')||''; if(/json/i.test(ct)){ const clone=r.clone(); clone.json().then(j=>window.__inqueritoRespostas.push({url:u,json:j})).catch(()=>{}); } }catch(e){} return r; };
        }

        const coletarPaginas = async micro => {
          const mapa=new Map(); await estabilizar(); await maiorPagina(); let assinaturaAnterior='',sem=0,pag=0;
          for(;pag<500;pag++){
            await estabilizar(); const itens=extrairDOM(micro); const ass=itens.map(x=>x.chave_externa).sort().join('|'); const antes=mapa.size; itens.forEach(x=>mapa.set(x.chave_externa,x)); if(mapa.size===antes&&ass===assinaturaAnterior)sem++;else sem=0; assinaturaAnterior=ass;
            const {next,disabled}=nextInfo(); if(!next||disabled||sem>=2)break; next.scrollIntoView({block:'center'}); next.click(); await esperar(900); let mudou=false; for(let i=0;i<8;i++){await esperar(300);const a=extrairDOM(micro).map(x=>x.chave_externa).sort().join('|');if(a&&a!==ass){mudou=true;break;}} if(!mudou)break;
          }
          return {itens:[...mapa.values()],paginas:pag+1};
        };

        const todos=new Map(), relatorio=[];
        for(const micro of sel){
          if(!selecionar(micro)){relatorio.push({microarea:micro,registros:0,paginas:0,erro:'Microárea não localizada'});continue;}
          await esperar(1200); const r=await coletarPaginas(micro); r.itens.forEach(x=>todos.set(x.chave_externa,x)); relatorio.push({microarea:micro,registros:r.itens.length,paginas:r.paginas});
        }

        // Extrai registros de respostas JSON capturadas, quando o endpoint retorna cidadãos.
        const jsonItens=[];
        const camposNome=['nome','nomePaciente','nome_paciente','nomeCompleto','nomeCompletoCidadao','no_cidadao','cidadaoNome'];
        const camposId=['id','idCidadao','id_cidadao','codigo','codigoCidadao','uuid','cns','cpf'];
        const percorrer=(v, micro, profundidade=0)=>{
          if(profundidade>8||v==null)return;
          if(Array.isArray(v)){ for(const x of v) percorrer(x,micro,profundidade+1); return; }
          if(typeof v!=='object')return;
          const keys=Object.keys(v); const nomeKey=keys.find(k=>camposNome.includes(k)||/nome.*(cidada|paciente)|^(nome)$/i.test(k));
          const idKey=keys.find(k=>camposId.includes(k)||/(id.*cidada|codigo.*cidada|cns|cpf)/i.test(k));
          const linkKey=keys.find(k=>/url|link|href/i.test(k)&&typeof v[k]==='string'&&/(cidada|paciente|familia|imovel)/i.test(v[k]));
          if(nomeKey && (idKey||linkKey)){
            const nome=String(v[nomeKey]||'').trim(); const id=String(v[idKey]||'').trim(); const link=linkKey?String(v[linkKey]):'';
            const href=link?new URL(link,location.href).href:(id?`${location.origin}/cidadao/${encodeURIComponent(id)}`:'');
            if(nome&&href) jsonItens.push({chave_externa:href,pec_url:href,nome_paciente:nome,cns:String(v.cns||v.CNS||'').trim(),cpf:String(v.cpf||v.CPF||'').trim(),telefone:String(v.telefone||v.celular||v.phone||'').trim(),ultima_visita:String(v.ultimaVisita||v.ultima_visita||v.dataUltimaVisita||'').trim(),equipe:contexto.equipe,microarea:micro,unidade:contexto.unidade,endereco:String(v.endereco||v.logradouro||'').trim()});
          }
          for(const k of keys) if(typeof v[k]==='object') percorrer(v[k],micro,profundidade+1);
        };
        for(const r of (window.__inqueritoRespostas||[])) percorrer(r.json, '', 0);
        // A resposta de rede pode não carregar a microárea no objeto; associamos ao território selecionado apenas quando houver um único contexto.
        for(const x of jsonItens){ if(!x.microarea) x.microarea=sel.length===1?sel[0]:''; if(x.microarea) todos.set(x.chave_externa,x); }
        return {itens:[...todos.values()],jsonDetectados:jsonItens.length,relatorio};
      },
      args: [selecionadas, { unidade: $('unidade').textContent, equipe: $('equipe').textContent }]
    });
    const itens = result?.itens || [];
    await chrome.runtime.sendMessage({ type: 'SAVE_MAILING', itens, contexto: { unidade: $('unidade').textContent, equipe: $('equipe').textContent, microareas: selecionadas, relatorio: result?.relatorio || [] } });
    const detalhes = (result?.relatorio || []).map(r => `${r.microarea}: ${r.registros}`).join(' | ');
    status(`Varredura concluída: ${itens.length} pacientes únicos. ${detalhes}`);
  } catch (e) {
    console.error(e);
    status('Não foi possível concluir a varredura: ' + e.message);
  } finally { $('btnGerar').disabled = false; }
}

async function capturarPaciente() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
      const t = s => document.querySelector(s)?.innerText?.trim() || document.querySelector(s)?.value?.trim() || '';
      const body = document.body?.innerText || '';
      return {
        microarea: t('#microarea,.microarea-val,[data-microarea]'), acs_nome: t('#nome-acs,.acs-nome-val,[data-acs]'),
        endereco: t('#endereco,.endereco-val,[data-endereco]'), nome_paciente: t('#nome-paciente,.nome-paciente,[data-nome-paciente]'),
        telefone: (body.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\d{4}|\d{4})[-.\s]?\d{4}/g) || []).join(' / '),
        pec_url: location.href, chave_externa: location.href
      };
    } });
    const d = result || {};
    const atual = (await chrome.runtime.sendMessage({ type: 'GET_MAILING' })).mailing;
    const itens = [...(atual?.itens || []), d];
    const dedup = [...new Map(itens.map(x => [x.chave_externa || x.pec_url, x])).values()];
    await chrome.runtime.sendMessage({ type: 'SAVE_MAILING', itens: dedup, contexto: atual?.contexto || {} });
    status('Paciente capturado para o mailing.');
  } catch (e) { status('Falha: ' + e.message); }
}

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { status('Nenhuma aba ativa.'); return; }
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extrairDadosPagina });
    $('unidade').textContent = result?.unidade || 'Não identificada';
    $('equipe').textContent = result?.equipe || 'Não identificada';
    const box = $('microareas'); box.innerHTML = '';
    (result?.microareas || []).forEach(m => {
      const l = document.createElement('label'); l.className = 'micro';
      const input = document.createElement('input'); input.type = 'checkbox'; input.name = 'microarea'; input.value = m; input.checked = true;
      l.append(input, document.createTextNode(' ' + m)); box.appendChild(l);
    });
    if (!result?.microareas?.length) box.textContent = 'Nenhuma microárea identificada nesta tela.';
  } catch (e) { status('Abra o e-SUS na tela de Acompanhamento do território.'); }
})();

$('btnTodos').onclick = () => document.querySelectorAll('input[name="microarea"]').forEach(x => x.checked = true);
$('btnGerar').onclick = executar;
$('btnPaciente').onclick = capturarPaciente;
