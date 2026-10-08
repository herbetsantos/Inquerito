const CRAWL = new Map();

const sleep = ms => new Promise(r => setTimeout(r, ms));

function waitTabComplete(tabId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => finish(new Error('Tempo esgotado aguardando o e-SUS responder.')), timeout);
    const finish = (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      err ? reject(err) : resolve();
    };
    const listener = (id, changeInfo) => {
      if (id === tabId && changeInfo.status === 'complete') finish();
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then(tab => {
      if (tab.status === 'complete') finish();
    }).catch(finish);
  });
}

async function injectExtract(tabId, args) {
  const [{result}] = await chrome.scripting.executeScript({
    target: {tabId},
    world: 'MAIN',
    func: (args) => {
      const text = el => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
      const body = document.body?.innerText || '';
      const phones = [...new Set((body.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\d{4}|\d{4})[-.\s]?\d{4}/g) || []).map(x => x.trim()))];
      const date = (body.match(/(?:última\s+visita|ultima\s+visita|último\s+atendimento|ultimo\s+atendimento)[^\d]{0,40}(\d{2}[\/.]\d{2}[\/.]\d{4})/i) || [])[1] || '';
      const links = [...document.querySelectorAll('a[href]')].map(a => ({text:text(a), href:new URL(a.getAttribute('href') || '', location.href).href}));
      const json = window.__INQUERITO_PEC_RESPONSES__ || [];
      const allJson = [];
      const walk = (v, depth=0) => {
        if (depth > 8 || v == null) return;
        if (Array.isArray(v)) return v.forEach(x => walk(x, depth+1));
        if (typeof v !== 'object') return;
        const keys = Object.keys(v);
        const nameKey = keys.find(k => /^(nome|nomePaciente|nome_paciente|nomeCompleto|no_cidadao)$/i.test(k) || /nome.*(paciente|cidada|morador)/i.test(k));
        const idKey = keys.find(k => /^(id|idCidadao|id_cidadao|codigo|codigoCidadao|cns|cpf)$/i.test(k) || /(id.*cidada|codigo.*cidada|cns|cpf)/i.test(k));
        if (nameKey || idKey) {
          const obj = {};
          for (const k of keys) {
            const val = v[k];
            if (val == null || typeof val === 'object') continue;
            if (/nome|cns|cpf|nascimento|telefone|celular|visita|endereco|logradouro|numero|bairro|cep|familia|microarea|equipe|acs/i.test(k)) obj[k] = String(val).trim();
          }
          if (Object.keys(obj).length >= 2) allJson.push(obj);
        }
        for (const k of keys) if (v[k] && typeof v[k] === 'object') walk(v[k], depth+1);
      };
      for (const r of json) walk(r.json);
      return {url:location.href, body, phones, date, links, json:allJson.slice(0,3000)};
    },
    args: [args]
  });
  return result;
}

async function runCrawler(msg, sender) {
  const sourceTabId = msg.tabId;
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const job = {jobId, sourceTabId, total:0, processed:0, errors:0, items:[], running:true};
  CRAWL.set(jobId, job);

  const update = async (extra={}) => {
    const payload = {type:'CRAWL_PROGRESS', jobId, ...job, ...extra};
    await chrome.storage.local.set({crawlProgress: payload});
  };

  try {
    const [{result:base}] = await chrome.scripting.executeScript({
      target:{tabId:sourceTabId}, world:'MAIN',
      func: async (microareas) => {
        const text = el => (el?.innerText || el?.textContent || '').replace(/\s+/g,' ').trim();
        const wait = ms => new Promise(r=>setTimeout(r,ms));
        const norm = v => String(v||'').replace(/^microárea\s*/i,'').replace(/\s*\(\d+\)\s*$/,'').trim();
        const select = label => {
          const target = norm(label);
          const els=[...document.querySelectorAll('[role="tab"],button,a[role="tab"]')];
          const el=els.find(x=>norm(text(x))===target);
          if(el){el.click();return true} return false;
        };
        const houses=[];
        for(const micro of microareas){
          if(!select(micro)) continue;
          await wait(1000);
          const headers=[...document.querySelectorAll('[data-accordion-component="AccordionItemButton"]')];
          for(const h of headers){
            if(h.getAttribute('aria-expanded')==='true') continue;
            const t=text(h);
            if(!/imóveis?/i.test(t)) continue;
            h.scrollIntoView({block:'center'}); h.click();
            await wait(350);
            const item=h.closest('[data-accordion-component="AccordionItem"]') || h.parentElement;
            for(const a of [...(item?.querySelectorAll('a[href]')||[])]){
              const href=a.getAttribute('href')||'';
              const m=href.match(/visualizarImovel\/(\d+)/i);
              if(!m) continue;
              houses.push({id:m[1],href:new URL(`/gestaoCadastros/acompanhamento-territorio/visualizarImovel/${m[1]}`,location.origin).href,microarea:micro});
            }
          }
          await wait(250);
        }
        return {houses:[...new Map(houses.map(h=>[h.id,h])).values()],url:location.href};
      },
      args:[msg.microareas||[]]
    });

    const houses=base?.houses||[];
    job.total=houses.length;
    await update({phase:'fila', current:'Fila montada'});

    if(!houses.length) throw new Error('Nenhuma casa foi encontrada. Verifique se as microáreas estão carregadas e se os grupos de imóveis aparecem.');

    const workTab=await chrome.tabs.create({url:houses[0].href, active:false});
    const tabId=workTab.id;

    for(let i=0;i<houses.length;i++){
      const h=houses[i];
      job.processed=i;
      await update({phase:'casa', current:`Casa ${i+1} de ${houses.length}`, house:h});
      try{
        for(const [section,label] of [['informacoes','Informações cadastrais'],['familias','Famílias e moradores'],['visitas','Últimas visitas']]){
          const url=`${h.href}/${section}`;
          await chrome.tabs.update(tabId,{url,active:false});
          await waitTabComplete(tabId,35000);
          await sleep(700);
          const data=await injectExtract(tabId,{house:h,section});
          job.items.push({house:h,section,label,data});
          await update({phase:'respondendo', current:`${label}: casa ${i+1}/${houses.length}`, house:h});
        }
      }catch(e){
        job.errors++;
        job.items.push({house:h,error:e.message});
      }
      await sleep(250);
    }
    await chrome.tabs.remove(tabId).catch(()=>{});
    job.running=false;
    await chrome.storage.local.set({crawlResult:{savedAt:new Date().toISOString(),jobId,itens:job.items},crawlProgress:{type:'CRAWL_PROGRESS',jobId,...job,phase:'concluido',current:'Coleta concluída'}});
    return {ok:true,jobId,total:job.total,errors:job.errors};
  }catch(e){
    job.running=false;
    await update({phase:'erro',current:e.message});
    return {ok:false,jobId,mensagem:e.message};
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'START_SEQUENTIAL_CRAWL') {
    runCrawler(msg,sender).then(sendResponse).catch(e=>sendResponse({ok:false,mensagem:e.message}));
    return true;
  }
  if (msg?.type === 'GET_CRAWL_PROGRESS') {
    chrome.storage.local.get(['crawlProgress','crawlResult']).then(data=>sendResponse({ok:true,...data}));
    return true;
  }
  if (msg?.type === 'SAVE_MAILING') {
    chrome.storage.local.set({mailing:{savedAt:new Date().toISOString(),itens:Array.isArray(msg.itens)?msg.itens:[],contexto:msg.contexto||{}}}).then(()=>sendResponse({ok:true,total:msg.itens?.length||0})).catch(err=>sendResponse({ok:false,mensagem:err.message}));
    return true;
  }
  if (msg?.type === 'GET_MAILING') {
    chrome.storage.local.get('mailing').then(data=>sendResponse({ok:true,mailing:data.mailing||null})).catch(err=>sendResponse({ok:false,mensagem:err.message}));
    return true;
  }
  if (msg?.type === 'CLEAR_MAILING') {
    chrome.storage.local.remove(['mailing','crawlResult','crawlProgress']).then(()=>sendResponse({ok:true})).catch(err=>sendResponse({ok:false,mensagem:err.message}));
    return true;
  }
});
