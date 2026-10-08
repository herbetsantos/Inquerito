const $ = id => document.getElementById(id);
const status = msg => { $('status').textContent = msg; };

async function executar() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { status('Nenhuma aba ativa.'); return; }
  const selecionadas = [...document.querySelectorAll('input[name="microarea"]:checked')].map(x => x.value);
  if (!selecionadas.length) { status('Selecione ao menos uma microárea.'); return; }
  if (!/^https:\/\/esus\.cajamar\.sp\.gov\.br\/gestaoCadastros\/acompanhamento-territorio/.test(tab.url || '')) {
    status('Abra o e-SUS na tela Acompanhamento do território.'); return;
  }
  $('btnGerar').disabled = true;
  status('Montando a fila de casas. Depois, a extensão abrirá uma casa por vez e aguardará cada resposta…');
  try {
    const r = await chrome.runtime.sendMessage({type:'START_SEQUENTIAL_CRAWL', tabId:tab.id, microareas:selecionadas});
    if (!r?.ok) { status('Falha ao iniciar: ' + (r?.mensagem || 'erro desconhecido')); return; }
    status(`Coleta iniciada: ${r.total || 0} casas na fila. Deixe a aba trabalhar até concluir.`);
    monitorarColeta(r.jobId);
  } catch(e) { status('Não foi possível iniciar a coleta: '+e.message); }
  finally { $('btnGerar').disabled=false; }
}

let monitor;
function monitorarColeta(jobId) {
  clearInterval(monitor);
  monitor=setInterval(async()=>{
    try {
      const r=await chrome.runtime.sendMessage({type:'GET_CRAWL_PROGRESS'});
      const p=r?.crawlProgress;
      if(!p || p.jobId!==jobId) return;
      if(p.phase==='concluido'){
        clearInterval(monitor);
        const c=(p.items||[]).filter(x=>x.house && x.data).length;
        status(`Coleta concluída: ${p.total||0} casas processadas, ${c} páginas internas coletadas, ${p.errors||0} erro(s).`);
      } else if(p.phase==='erro'){
        clearInterval(monitor); status('Coleta interrompida: '+(p.current||'erro desconhecido'));
      } else {
        status(`${p.current||'Processando…'} — ${p.processed||0}/${p.total||0} casas.`);
      }
    } catch(_) {}
  },1200);
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
