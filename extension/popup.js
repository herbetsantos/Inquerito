const $ = id => document.getElementById(id);
const status = msg => { $('status').textContent = msg; };

async function executar() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { status('Nenhuma aba ativa.'); return; }
  const selecionadas = [...document.querySelectorAll('input[name="microarea"]:checked')].map(x => x.value);
  if (!selecionadas.length) { status('Selecione ao menos uma microárea.'); return; }
  if (!/^https:\/\/esus\.cajamar\.sp\.gov\.br\/gestaoCadastros\/acompanhamento-territorio/.test(tab.url || '')) {
    status('Abra o e-SUS na tela Acompanhamento do território.');
    return;
  }
  $('btnGerar').disabled = true;
  status('Lendo o território e abrindo os grupos de imóveis…');

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: async (sel, contexto) => {
        const texto = el => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
        const esperar = ms => new Promise(r => setTimeout(r, ms));
        const normalizar = v => String(v || '').replace(/^microárea\s*/i, '').replace(/\s*\(\d+\)\s*$/, '').trim();
        const telefone = s => {
          const m = String(s || '').match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\d{4}|\d{4})[-.\s]?\d{4}/g);
          return m ? [...new Set(m.map(x => x.trim()))].join(' / ') : '';
        };
        const visita = s => (String(s || '').match(/(?:última\s+visita|ultima\s+visita|último\s+atendimento|ultimo\s+atendimento|visita|atendimento)[^\d]{0,35}(\d{2}[\/.]\d{2}[\/.]\d{4})/i) || [])[1] || '';

        const selecionarMicroarea = label => {
          const alvo = normalizar(label);
          const els = [...document.querySelectorAll('[role="tab"], [role="tablist"] [role="tab"], a[role="tab"], button')];
          const el = els.find(x => normalizar(texto(x)) === alvo);
          if (el) { el.click(); return true; }
          return false;
        };

        const expandirGrupos = async () => {
          let total = 0;
          for (let rodada = 0; rodada < 8; rodada++) {
            const headers = [...document.querySelectorAll(
              '[data-accordion-component="AccordionItemButton"][role="button"], [data-accordion-component="AccordionItemButton"]'
            )];
            let clicados = 0;
            for (const h of headers) {
              const t = texto(h).toLowerCase();
              const aberto = h.getAttribute('aria-expanded') === 'true';
              if (!aberto && /\bimóveis?\b/.test(t)) {
                h.scrollIntoView({block:'center'});
                h.click();
                clicados++;
                total++;
                await esperar(90);
              }
            }
            await esperar(500);
            if (!clicados) break;
          }
          return total;
        };

        const extrairLinksImoveis = micro => {
          const mapa = new Map();
          for (const a of [...document.querySelectorAll('a[href]')]) {
            const href0 = a.getAttribute('href') || '';
            if (!/\/gestaoCadastros\/acompanhamento-territorio\/visualizarImovel\/\d+(?:\/[^/?#]+)?(?:[?#]|$)/i.test(href0)) continue;
            const href = new URL(href0, location.href).href;
            const m = href.match(/\/visualizarImovel\/(\d+)/i);
            if (!m) continue;
            const box = a.closest('li,article,tr,[role="row"],[data-accordion-component="AccordionItem"],.card') || a.parentElement;
            const linha = texto(box || a);
            const key = m[1];
            mapa.set(key, {
              chave_externa: key,
              pec_url: new URL(`/gestaoCadastros/acompanhamento-territorio/visualizarImovel/${key}`, location.origin).href,
              nome_paciente: '',
              cns: '',
              cpf: '',
              data_nascimento: '',
              telefone: telefone(linha),
              ultima_visita: visita(linha),
              equipe: contexto.equipe || '',
              microarea: micro || '',
              unidade: contexto.unidade || '',
              acs_nome: '',
              endereco: linha
            });
          }
          return [...mapa.values()];
        };

        const extrairLinhasGenericas = micro => {
          const itens = [];
          const candidatos = [...document.querySelectorAll('[role="link"], [role="button"], button')];
          for (const el of candidatos) {
            const t = texto(el);
            if (!t || !/\b(imóvel|domicílio|casa)\b/i.test(t)) continue;
            const href = el.getAttribute('data-href') || el.getAttribute('href') || '';
            const m = String(href).match(/visualizarImovel\/(\d+)/i);
            if (!m) continue;
            itens.push({
              chave_externa:m[1],
              pec_url:new URL(`/gestaoCadastros/acompanhamento-territorio/visualizarImovel/${m[1]}`, location.origin).href,
              nome_paciente:'', cns:'', cpf:'', data_nascimento:'',
              telefone:telefone(t), ultima_visita:visita(t),
              equipe:contexto.equipe||'', microarea:micro||'', unidade:contexto.unidade||'', acs_nome:'', endereco:t
            });
          }
          return itens;
        };

        const respostas = window.__INQUERITO_PEC_RESPONSES__ || [];
        const todos = new Map();
        const relatorio = [];

        for (const micro of sel) {
          if (!selecionarMicroarea(micro)) {
            relatorio.push({microarea:micro,registros:0,grupos_abertos:0,erro:'Microárea não localizada'});
            continue;
          }
          await esperar(900);
          const grupos = await expandirGrupos();
          await esperar(500);
          const itens = [...extrairLinksImoveis(micro), ...extrairLinhasGenericas(micro)];
          for (const item of itens) todos.set(item.chave_externa, item);
          relatorio.push({microarea:micro,registros:itens.length,grupos_abertos:grupos});
        }

        const jsonItens = [];
        const camposNome = ['nome','nomePaciente','nome_paciente','nomeCompleto','nomeCompletoCidadao','no_cidadao','cidadaoNome'];
        const camposId = ['id','idCidadao','id_cidadao','codigo','codigoCidadao','uuid','cns','cpf'];
        const percorrer = (v, micro, profundidade=0) => {
          if (profundidade > 9 || v == null) return;
          if (Array.isArray(v)) { for (const x of v) percorrer(x,micro,profundidade+1); return; }
          if (typeof v !== 'object') return;
          const keys = Object.keys(v);
          const nomeKey = keys.find(k => camposNome.includes(k) || /nome.*(cidada|paciente)|^(nome)$/i.test(k));
          const idKey = keys.find(k => camposId.includes(k) || /(id.*cidada|codigo.*cidada|cns|cpf)/i.test(k));
          if (nomeKey && idKey) {
            const nome = String(v[nomeKey] || '').trim();
            const id = String(v[idKey] || '').trim();
            if (nome && id) {
              const key = id;
              jsonItens.push({
                chave_externa:key, pec_url:'',
                nome_paciente:nome,
                cns:String(v.cns||v.CNS||'').trim(),
                cpf:String(v.cpf||v.CPF||'').trim(),
                data_nascimento:String(v.dataNascimento||v.data_nascimento||v.nascimento||'').trim(),
                telefone:String(v.telefone||v.celular||v.phone||'').trim(),
                ultima_visita:String(v.ultimaVisita||v.ultima_visita||v.dataUltimaVisita||'').trim(),
                equipe:contexto.equipe||'', microarea:micro||'', unidade:contexto.unidade||'',
                acs_nome:String(v.acsNome||v.acs_nome||'').trim(),
                endereco:String(v.endereco||v.logradouro||'').trim()
              });
            }
          }
          for (const k of keys) if (v[k] && typeof v[k] === 'object') percorrer(v[k],micro,profundidade+1);
        };
        for (const r of respostas) percorrer(r.json, sel.length===1 ? sel[0] : '', 0);

        return {
          itens:[...todos.values()],
          jsonDetectados:jsonItens.length,
          jsonAmostra:jsonItens.slice(0,2000),
          relatorio,
          rede:respostas.length,
          url:location.href
        };
      },
      args: [selecionadas, { unidade: $('unidade').textContent, equipe: $('equipe').textContent }]
    });

    let itens = result?.itens || [];
    // JSON estruturado do PEC é preferível aos dados genéricos do DOM quando houver identificador.
    if (result?.jsonAmostra?.length) {
      const mapa = new Map(itens.map(x => [x.chave_externa, x]));
      for (const x of result.jsonAmostra) {
        const key = x.chave_externa || x.cns || x.cpf || x.nome_paciente;
        if (!key) continue;
        const atual = mapa.get(key) || {};
        mapa.set(key, {...atual, ...Object.fromEntries(Object.entries(x).filter(([,v]) => v !== ''))});
      }
      itens = [...mapa.values()];
    }

    await chrome.runtime.sendMessage({
      type:'SAVE_MAILING',
      itens,
      contexto:{
        unidade:$('unidade').textContent,
        equipe:$('equipe').textContent,
        microareas:selecionadas,
        relatorio:result?.relatorio || [],
        rede:result?.rede || 0,
        jsonDetectados:result?.jsonDetectados || 0
      }
    });

    const detalhes = (result?.relatorio || []).map(r => `${r.microarea}: ${r.registros}`).join(' | ');
    status(`Coleta concluída: ${itens.length} registros. ${detalhes || 'sem registros detectados'}; JSON: ${result?.jsonDetectados || 0}.`);
  } catch (e) {
    console.error(e);
    status('Não foi possível concluir a coleta: ' + (e?.message || e));
  } finally {
    $('btnGerar').disabled = false;
  }
}

async function capturarPaciente() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: () => {
        const t = s => document.querySelector(s)?.innerText?.trim() || document.querySelector(s)?.value?.trim() || '';
        const body = document.body?.innerText || '';
        return {
          microarea:t('#microarea,.microarea-val,[data-microarea]'),
          acs_nome:t('#nome-acs,.acs-nome-val,[data-acs]'),
          endereco:t('#endereco,.endereco-val,[data-endereco]'),
          nome_paciente:t('#nome-paciente,.nome-paciente,[data-nome-paciente]'),
          telefone:(body.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\d{4}|\d{4})[-.\s]?\d{4}/g)||[]).join(' / '),
          pec_url:location.href,
          chave_externa:location.href
        };
      }
    });
    const d=result||{};
    const atual=(await chrome.runtime.sendMessage({type:'GET_MAILING'})).mailing;
    const itens=[...(atual?.itens||[]),d];
    const dedup=[...new Map(itens.map(x=>[x.chave_externa||x.pec_url,x])).values()];
    await chrome.runtime.sendMessage({type:'SAVE_MAILING',itens:dedup,contexto:atual?.contexto||{}});
    status('Registro capturado para o mailing.');
  } catch(e){ status('Falha: '+e.message); }
}

async function carregarContexto() {
  const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
  if (!tab?.id) { status('Nenhuma aba ativa.'); return; }
  try {
    const [{result}] = await chrome.scripting.executeScript({
      target:{tabId:tab.id},
      world:'MAIN',
      func:()=>{
        const txt=el=>el?.innerText?.trim()||el?.value?.trim()||'';
        const body=document.body?.innerText||'';
        const unidade=txt(document.querySelector('input[name="unidadeSaude"]')) ||
          txt(document.querySelector('[data-unidade-saude], .unidade-saude')) ||
          ((body.match(/Unidade(?: de saúde)?\s*:?\s*([^\n]+)/i)||[])[1]||'').trim();
        const equipe=txt(document.querySelector('input[name="equipe"]')) ||
          txt(document.querySelector('[data-equipe], .equipe')) ||
          ((body.match(/Equipe\s*:?\s*([^\n]+)/i)||[])[1]||'').trim();
        const tabs=[...document.querySelectorAll('[role="tab"]')].map(el=>txt(el)).filter(Boolean);
        const microareas=[...new Set(tabs.filter(t=>/^(microárea\s*)?\d{1,3}(\s*\(\d+\))?$/i.test(t)||/fora de área/i.test(t)))];
        return {unidade,equipe,microareas};
      }
    });
    $('unidade').textContent=result?.unidade||'Não identificada';
    $('equipe').textContent=result?.equipe||'Não identificada';
    const box=$('microareas'); box.innerHTML='';
    (result?.microareas||[]).forEach(m=>{
      const l=document.createElement('label'); l.className='micro';
      const input=document.createElement('input'); input.type='checkbox'; input.name='microarea'; input.value=m; input.checked=true;
      l.append(input,document.createTextNode(' '+m)); box.appendChild(l);
    });
    if(!result?.microareas?.length) box.textContent='Nenhuma microárea identificada nesta tela.';
    status(result?.microareas?.length ? 'Pronto para coletar.' : 'Abra Acompanhamento do território e selecione uma microárea.');
  } catch(e) {
    status('Abra o e-SUS na tela Acompanhamento do território.');
  }
}

$('btnTodos').onclick=()=>document.querySelectorAll('input[name="microarea"]').forEach(x=>x.checked=true);
$('btnGerar').onclick=executar;
$('btnPaciente').onclick=capturarPaciente;
carregarContexto();
