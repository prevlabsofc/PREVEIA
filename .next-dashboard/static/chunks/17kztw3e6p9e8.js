(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,927232,e=>{"use strict";function t(e){return(t="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}e.s(["default",()=>t])},274246,688438,964077,e=>{"use strict";let t=72/2.54;function a(e){return"classico"===e?"classico":"moderno"}function i(e){let t=String(e?.cidade||e?.city||"").trim(),a=String(e?.estado||e?.state||e?.oab_uf||"").trim().toUpperCase();return(t||a&&"MA"!==a||(t="São Luís",a="MA"),t&&a)?{cidade:t,uf:a,localFormatado:`${t}/${a}`}:t?{cidade:t,uf:a,localFormatado:t}:a?{cidade:"",uf:a,localFormatado:`[Cidade]/${a}`}:{cidade:"São Luís",uf:"MA",localFormatado:"São Luís/MA"}}function o(e,t=new Date){let{localFormatado:a}=i(e),r=function(e=new Date){return e.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"})}(t);return`${a}, ${r}`}function r(e,t){let{cidade:a,uf:o,localFormatado:r}=i(t);if(!o)return e;let d=e,l=o.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return d=d.replace(RegExp(`(^|\\n)(\\*{0,2})${l},(\\s+\\d{1,2}\\s+de\\s+[A-Za-z\xe7\xc7\xe1\xe9\xed\xf3\xfa\xe3\xf5\xe2\xea\xf4\xe0\xfc]+\\s+de\\s+\\d{4})`,"gi"),`$1$2${r},$3`),d=a?d.replace(RegExp(`(^|[^A-Za-z\xc0-\xff0-9])\\/${l}\\b`,"g"),`$1${r}`):d.replace(RegExp(`(^|[^A-Za-z\xc0-\xff0-9\\]])\\/${l}\\b`,"g"),`$1[Cidade]/${o}`)}function d(e){return e.replace(/^#{1,6}\s+/,"").replace(/^\*{1,2}/,"").replace(/\*{1,2}$/,"").replace(/^[IVXLC]+[.\-–—)\s:]+/i,"").replace(/^\d+(\.\d+)*[.\-–—)\s]+/,"").trim().toLowerCase().replace(/\s+/g," ")}function l(e){let t=e.trim();return/^#{1,6}\s+\S/.test(t)||/^\*{0,2}\d+(\.\d+)*\s+[A-ZÀ-Ÿ]/.test(t)||/^\*{0,2}[IVXLC]+\s*[–—\-.:)]\s+\S/.test(t)}function n(e){let t=e.match(/^(#{1,6})\s/);return t?t[1].length:/^\*{0,2}\d+\.\d+/.test(e.trim())?3:(/^\*{0,2}\d+\s/.test(e.trim()),2)}function s(e){let t=e.split("\n"),a=[];for(let e=0;e<t.length;e++){let i=t[e],o=t[e+1];if(l(i)&&o&&l(o)&&d(i)===d(o)&&d(i).length>3){n(i)<=n(o)&&(a.push(i),e++);continue}a.push(i)}let i=[];for(let e=0;e<a.length;e++){let t=i[i.length-1],o=a[e];t&&l(t)&&o.trim()&&d(t)===d(o)&&d(t).length>3||i.push(o)}return i.join("\n")}function p(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function c(e){return e.replace(/^#{1,6}\s+/gm,"").replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/__(.+?)__/g,"$1").replace(/_(.+?)_/g,"$1").replace(/`([^`]+)`/g,"$1")}function m(e){let t=e.search(/\n(?:(?:Nestes termos|Termos em que)[,.]?\s*\n+)?(?:Pede deferimento\.?)/i);if(-1===t){let t=e.search(/\n\*{0,2}[A-Za-zÀ-ÿ ].*\/[A-Z]{2},?\s+\d{1,2}\s+de\s+\w+/i);return -1===t?e:g(e,t)}return g(e,t)}function g(e,t){let a=e.length,i=e.slice(t).search(/\n(?:>\s|Esta petição foi elaborada|\*{0,2}"A proteção)/i);return i>0&&(a=t+i),`${e.slice(0,t)}

<<<CLOSING>>>
${e.slice(t+1,a)}
<<<END_CLOSING>>>${e.slice(a)}`}let x=/(S[IÍ]NTESE|QUADRO\s+SIN[OÓ]PTICO|PROVAS\s+JUNTADAS|FUNDAMENTA[CÇ][AÃ]O|DOS?\s+PEDIDOS?|PRELIMINARMENTE|PLANILHA|FUMUS|PERICULUM)/i;function f(e){var t;let i,o,d,l,n,g,f,h,b=a(e.estilo),u=e.corPeticao||String(e.adv.cor_peticao||"#1d4ed8"),v=function(e,t={}){let i=a(t.estilo),o=r(e,t.adv);o=m(o=s(o));let d=RegExp("\\|(.+)\\|\\n\\|[-:\\s|]+\\|\\n((?:\\|.+\\|\\n?)+)","g");o=(o=(o=o.replace(d,(e,t,a)=>{let i=t.split("|").map(e=>e.trim()).filter(Boolean),o=a.trim().split("\n").map(e=>e.split("|").map(e=>e.trim()).filter(Boolean)),r='<div class="doc-table-wrap keep-together"><table class="doc-table"><thead><tr>';return i.forEach(e=>{r+=`<th>${p(c(e))}</th>`}),r+="</tr></thead><tbody>",o.forEach((e,t)=>{r+=`<tr class="${t%2==0?"even":"odd"}">`,e.forEach(e=>{r+=`<td>${p(c(e))}</td>`}),r+="</tr>"}),r+="</tbody></table></div>"})).replace(/<<<CLOSING>>>\n?/g,'<div class="closing-block keep-together">')).replace(/<<<END_CLOSING>>>/g,"</div>");let l=e=>p(c(String(e)));return(o=(o=(o=(o=(o=(o=function(e){let t=e.split(/(<div class="doc-box keep-together">)/);if(1===t.length)return e;let a=t[0];for(let e=1;e<t.length;e++)if('<div class="doc-box keep-together">'===t[e]){let i=t[e+1]||"",o=i.search(/<div class="(?:section-bar|section-classic|main-title|closing-block|doc-box)/);-1===o?a+=`<div class="doc-box keep-together">${i}</div>`:a+=`<div class="doc-box keep-together">${i.slice(0,o)}</div>${i.slice(o)}`,e++}else a+=t[e];return a}(o=(o=(o=(o=(o=(o=(o=(o=o.replace(/^#### (.+)$/gm,(e,t)=>`<div class="sub-sub-title">${l(t)}</div>`)).replace(/^### (.+)$/gm,(e,t)=>`<div class="sub-title">${l(t)}</div>`)).replace(/^## (.+)$/gm,(e,t)=>{let a=c(String(t)),o=x.test(a),r=`<div class="${"classico"===i?"section-classic":"section-bar"}${o?" doc-box-title":""}">${p(a)}</div>`;return o?`<<<BOX_START>>>${r}`:r})).replace(/^# (.+)$/gm,(e,t)=>`<div class="main-title">${l(t)}</div>`)).replace(/^(\*{0,2})(\d+\.\d+(?:\.\d+)*)\s+(.+?)(\*{0,2})$/gm,(e,t,a,i)=>{let o=`${a} ${c(String(i))}`,r=/fumus|periculum/i.test(o)?" keep-together":"";return`<div class="sub-title${r}">${p(o)}</div>`})).replace(/^(\*{0,2})(Fumus\s+boni\s+iuris(?:\s*[\/·–—-]\s*Periculum\s+in\s+mora)?|Periculum\s+in\s+mora)(\*{0,2})\s*$/gim,(e,t,a)=>`<div class="sub-title keep-together">${p(c(String(a)))}</div>`)).replace(/^(\*{0,2})(\d+)\.\s+([A-ZÀ-Ÿ].+?)(\*{0,2})$/gm,(e,t,a,o)=>{let r=`${a}. ${c(String(o))}`,d=x.test(r),l=`<div class="${"classico"===i?"section-classic":"section-bar"}${d?" doc-box-title":""}">${p(r)}</div>`;return d?`<<<BOX_START>>>${l}`:l})).replace(/<<<BOX_START>>>/g,'<div class="doc-box keep-together">'))).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")).replace(/\*(.+?)\*/g,"<em>$1</em>")).replace(/^---$/gm,'<hr class="divider"/>')).replace(/^✓ (.+)$/gm,'<div class="proof-item"><span class="check">✓</span>$1</div>')).replace(/^>\s?(.+)$/gm,'<blockquote class="doc-quote">$1</blockquote>')).split("\n\n").map(e=>e.startsWith("<")||e.includes("<div")?e:e.trim()?/<(?:div|table|hr|blockquote)/.test(e)?e.split("\n").map(e=>e.trim()?e.startsWith("<")?e:`<p class="doc-para">${e}</p>`:"").join(""):`<p class="doc-para">${e.replace(/\n/g,"<br/>")}</p>`:"").join("")}(e.text,{estilo:b,adv:e.adv}),A=String(e.adv.office_name||e.adv.name||"Advogado");return`
    <style>${function(e){let{estilo:t,corPeticao:a}=e,i="moderno"===t,o=!1!==e.comMargens?"padding: 3cm 2cm 2cm 3cm;":"padding: 0;";return`
    .pdf-page {
      font-family: 'Times New Roman', Times, serif;
      color: #1a1a1a;
      ${o}
      background: #fff;
      box-sizing: border-box;
      width: 100%;
      height: auto;
      min-height: 0;
    }
    .pdf-banner { width: 100%; max-height: 72px; object-fit: contain; object-position: left center; margin-bottom: 10px; display: block; }
    .pdf-header { display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #0A2540; padding-bottom: 14px; margin-bottom: 24px; page-break-inside: avoid; break-inside: avoid; }
    .pdf-header .logo { height: 50px; max-width: 180px; object-fit: contain; }
    .pdf-header .logo-fallback { height: 44px; width: 44px; border-radius: 8px; background: linear-gradient(135deg, #D4AF37, #B8941F); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size: 11px; color:#000; }
    .pdf-header .office-info { text-align:right; }
    .pdf-header .office-name { font-weight:bold; font-size: 13px; color:#0A2540; text-transform:uppercase; }
    .pdf-header .office-sub { font-size: 10px; color:#555; margin-top:2px; }
    .pdf-header .office-mail { font-size: 10px; color:${i?"#1d4ed8":"#333"}; margin-top:1px; }
    .section-bar { background: linear-gradient(135deg, ${a}, ${a}cc); color: #fff; font-weight: bold; font-size: 13px; padding: 8px 14px; margin: 22px 0 14px; border-left: 5px solid #D4AF37; text-transform: uppercase; letter-spacing: 0.5px; page-break-after: avoid; break-after: avoid; }
    .section-classic { color: #000; font-weight: bold; font-size: 13px; padding: 4px 0; margin: 22px 0 10px; text-transform: uppercase; text-decoration: underline; letter-spacing: 0.3px; border: none; background: none; page-break-after: avoid; break-after: avoid; }
    .sub-title { font-weight: bold; font-size: 12px; text-decoration: underline; margin: 14px 0 6px 16px; color:${i?"#0A2540":"#000"}; page-break-after: avoid; break-after: avoid; }
    .sub-sub-title { font-weight: bold; font-size: 11px; margin: 10px 0 4px 28px; color:#000; page-break-after: avoid; break-after: avoid; }
    .main-title { text-align:center; font-weight:bold; font-size:15px; text-transform:uppercase; margin: 18px 0; color:${i?"#0A2540":"#000"}; page-break-after: avoid; break-after: avoid; }
    p, .doc-para {
      font-size: 12px;
      line-height: 1.65;
      text-align: justify;
      margin: 0 0 10px;
      orphans: 3;
      widows: 3;
      page-break-inside: auto;
      break-inside: auto;
      overflow-wrap: anywhere;
      word-wrap: break-word;
    }
    strong { color: ${i?"#0A2540":"#000"}; }
    .divider { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
    table.doc-table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; font-size: 11px; }
    table.doc-table th { background: ${i?"#0A2540":"#000"}; color: #fff; padding: 7px 10px; text-align:left; font-size:10px; text-transform:uppercase; }
    table.doc-table td { padding: 6px 10px; border-bottom: 1px solid #e5e5e5; }
    table.doc-table tr.even td { background: ${i?"#f4f6f9":"#f5f5f5"}; }
    .proof-item { display:flex; align-items:center; gap:8px; font-size:12px; padding:6px 10px; margin-bottom:4px; background:${i?"#f8f8f8":"transparent"}; border-left: 3px solid ${i?"#D4AF37":"#000"}; page-break-inside: avoid; break-inside: avoid; }
    .proof-item .check { color:${i?"#D4AF37":"#000"}; font-weight:bold; }
    .doc-box { ${i?"border: 1px solid #c5d0e0; background: #f8fafc; padding: 12px 14px; margin: 16px 0; border-radius: 4px;":"border: 1px solid #000; background: transparent; padding: 10px 12px; margin: 16px 0;"}
      page-break-inside: avoid; break-inside: avoid;
    }
    .doc-box .section-bar, .doc-box .section-classic { margin-top: 0; }
    .doc-table-wrap { page-break-inside: avoid; break-inside: avoid; }
    .closing-block { text-align: right; margin-top: 36px; margin-left: auto; max-width: 58%; page-break-inside: avoid; break-inside: avoid; }
    .closing-block p { text-align: right; margin-bottom: 6px; }
    .closing-block strong { color: #000; }
    .doc-quote { font-size: 11px; color: #444; border-left: 2px solid #ccc; padding-left: 10px; margin: 12px 0; font-style: italic; text-align: left; }
    .pdf-footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; display:flex; justify-content:space-between; font-size: 9px; color: #888; page-break-inside: avoid; break-inside: avoid; }
    .pdf-page-spacer { width: 100%; display: block; pointer-events: none; }
    .keep-together { page-break-inside: avoid; break-inside: avoid; }
  `}({estilo:b,corPeticao:u,comMargens:e.comMargens})}</style>
    <div class="pdf-page">
      ${i=String((t=e.adv).office_name||t.name||"Advogado"),o=String(t.oab_uf||t.estado||"").toUpperCase(),d=String(t.oab_number||""),l=String(t.email||""),n=String(t.whatsapp||t.phone||""),g=t.banner_url?`<img src="${p(String(t.banner_url))}" class="pdf-banner" alt="Timbre"/>`:"",f=`${window.location.origin}/logo.png`,h=t.logo_url?`<img src="${p(String(t.logo_url))}" class="logo" alt="Logo"/>`:`<img src="${f}" class="logo" alt="Marple"/>`,`
    ${g}
    <div class="pdf-header keep-together">
      ${h}
      <div class="office-info">
        <div class="office-name">${p(i)}</div>
        <div class="office-sub">OAB/${p(o)} n\xba ${p(d)}</div>
        ${l?`<div class="office-mail">${p(l)}</div>`:""}
        ${n?`<div class="office-mail">${p(n)}</div>`:""}
      </div>
    </div>
  `}
      <div class="pdf-body">${v}</div>
      <div class="pdf-footer">
        <span>${p(A)}</span>
        <span>Gerado via Marple</span>
      </div>
    </div>
  `}e.s(["A4_WIDTH_PX",0,794,"MARGEM_PETICAO_PT",0,{left:3*t,top:3*t,right:2*t,bottom:2*t},"corrigirLocalNoTexto",0,r,"formatarLocalData",0,o,"limparMarkdownResidual",0,c,"marcarBlocoFinal",0,m,"margensDocxTwips",0,function(){return{top:Math.round(1701),right:Math.round(1134),bottom:Math.round(1134),left:Math.round(1701)}},"montarHtmlPeticao",0,f,"normalizarEstiloPeticao",0,a,"prepararTextoPeticao",0,function(e,t){return s(r(e,t))},"resolverLocalAdvogado",0,i],688438);let h="salario-maternidade-rural";function b(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function u(e,t="A informar"){let a=String(e||"").trim();if(!a)return t;if(!/\d/.test(a))return a;let i=e=>e>=1900&&e<=Math.min(2100,new Date().getFullYear()+1),o=(e,t,a)=>!i(a)||t<1||t>12||e<1||e>31?null:`${String(e).padStart(2,"0")}/${String(t).padStart(2,"0")}/${a}`,r=a.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);if(r){var d;let e;return o(Number.parseInt(r[1],10),Number.parseInt(r[2],10),(e=Number.parseInt(d=r[3],10),2===d.length?e>=50?1900+e:2e3+e:e))||t}if(r=a.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))return o(Number.parseInt(r[3],10),Number.parseInt(r[2],10),Number.parseInt(r[1],10))||t;if(r=a.match(/^(\d{4})$/)){let e=Number.parseInt(r[1],10);return i(e)?String(e):t}let l=/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/g;if(l.test(a))return a.replace(l,e=>u(e,t));let n=/(\d{4})-(\d{2})-(\d{2})/g;return n.test(a)?a.replace(n,e=>u(e,t)):a}function v(e,t,a){let i=e.indexOf(t);if(-1===i)return"";let o=e.indexOf(a,i+t.length);return -1===o?e.slice(i+t.length).trim():e.slice(i+t.length,o).trim()}function A(e){return String(e||"").replace(/\u00a0/g," ").replace(/[ \t]+/g," ").replace(/\s+\n/g,"\n").replace(/\n\s+/g,"\n").trim()}function E(e,t=""){let a=t?`sm-para ${t}`:"sm-para";return e.split(/\n\s*\n/).map(e=>e.trim()).filter(Boolean).map(e=>{let t=b(A(c(e)).replace(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/g,e=>u(e)).replace(/(\d{4})-(\d{2})-(\d{2})/g,e=>u(e))).replace(/\n/g,"<br/>");return`<p class="${a}">${t}</p>`}).join("")}function w(e){let t,a,i,o,r;if(!e)return"";let d=e.estilo||"horizontal";if("none"===d||!e.eventos?.length)return"";if("vertical"===d){let t,a;return t=`LINHA DO TEMPO — ${e.nome.toUpperCase()} | ${e.atividade}${e.local?` • ${e.local}`:""}`,a=(e.eventos.length?e.eventos:[{data:"—",titulo:"Sem eventos",detalhe:""}]).map((e,t)=>`
      <tr>
        <td class="sm-tl-num">${t+1}</td>
        <td class="sm-tl-data">${b(e.data)}</td>
        <td class="sm-tl-body">
          <div class="sm-tl-titulo">${b(e.titulo)}</div>
          ${e.detalhe?`<div class="sm-tl-detalhe">${b(e.detalhe)}</div>`:""}
        </td>
      </tr>`).join(""),`
    <div class="sm-timeline sm-timeline-vertical keep-together">
      <div class="sm-tl-title">${b(t)}</div>
      <table class="sm-tl-table" cellpadding="0" cellspacing="0">
        <tbody>${a}</tbody>
      </table>
    </div>
  `}return i=(a=(t=e.eventos.length?e.eventos:[{data:"—",titulo:"Sem eventos",detalhe:""}]).length)>1?624/(a-1):0,o=`LINHA DO TEMPO — ${e.nome.toUpperCase()} | ${e.atividade}${e.local?` • ${e.local}`:""}`,r="",t.forEach((e,t)=>{let a=48+t*i,o=t%2==0;r+=`
      <circle cx="${a}" cy="130" r="14" fill="#0A2540" stroke="#D4AF37" stroke-width="2"/>
      <text x="${a}" y="135" text-anchor="middle" fill="#fff" font-size="11" font-family="Arial,sans-serif" font-weight="700">${t+1}</text>
      <text x="${a}" y="${o?60:204}" text-anchor="middle" fill="#555" font-size="10" font-family="Arial,sans-serif">${b(e.data)}</text>
      <text x="${a}" y="${o?78:168}" text-anchor="middle" fill="#0A2540" font-size="11" font-family="Arial,sans-serif" font-weight="700">${b(e.titulo)}</text>
      ${e.detalhe?`<text x="${a}" y="${o?96:186}" text-anchor="middle" fill="#666" font-size="9" font-family="Arial,sans-serif">${b(e.detalhe)}</text>`:""}
    `}),`
    <div class="sm-timeline keep-together">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 260" width="100%" height="260" role="img" aria-label="${b(o)}">
        <rect x="0" y="0" width="720" height="260" rx="12" ry="12" fill="#EEF1F5" stroke="#D0D7E2"/>
        <text x="16" y="28" fill="#0A2540" font-size="12" font-family="Arial,sans-serif" font-weight="700">${b(o)}</text>
        <line x1="48" y1="130" x2="672" y2="130" stroke="#0A2540" stroke-width="2.5"/>
        ${r}
      </svg>
    </div>
  `}function I(e,t=!0){if(!e.length)return"";let a=e.map(e=>{let t=e.match(/^((?:viii|vii|vi|iv|ix|iii|ii|v|i|x)+)\.\s*([\s\S]*)$/i),a=t?t[1].toLowerCase():"",i=t?t[2]:e;return`
        <table class="sm-pedido-item" data-pdf-keep="1" cellpadding="0" cellspacing="0" width="100%" border="0"
          style="width:100%;border-collapse:collapse;margin:0 0 10px;page-break-inside:avoid;break-inside:avoid;">
          <tr>
            <td style="font-size:11.5px;line-height:1.6;text-align:justify;padding:0;vertical-align:top;">
              <span class="sm-rom">${b(a)}.</span> ${b(c(i))}
            </td>
          </tr>
        </table>`}).join("");return`
    <div class="sm-pedidos">
      ${t?'<p class="sm-para sm-pedidos-intro">Diante do exposto, requer:</p>':""}
      ${a}
    </div>
  `}function $(e){return`<div class="sm-section-bar keep-together">${b(e)}</div>`}function S(e){return e.includes("<<<SM_RURAL_V2>>>")}function D(e){var t,a,i,d,l,n,s;let p,m,g,x,f,h,D,y,T,O,N,_=r(e.text,e.adv);if(!S(_))return null;let R=(t=v(_,"<<<META>>>","<<<END_META>>>"),{tipoAcao:t.match(/tipo_acao:\s*(.+)/i)?.[1]?.trim()||"SALÁRIO MATERNIDADE - SEGURADO ESPECIAL",juizoDigital:!/juizo_digital:\s*false/i.test(t),prioridades:{idoso:/prioridade_idoso:\s*true/i.test(t),deficiente:/prioridade_deficiente:\s*true/i.test(t),menor:/prioridade_menor:\s*true/i.test(t)}}),k=v(_,"<<<ENDERECO>>>","<<<END_ENDERECO>>>"),L=v(_,"<<<QUALIFICACAO>>>","<<<END_QUALIFICACAO>>>"),M=v(_,"<<<TITULO>>>","<<<SUBTITULO>>>"),C=v(_,"<<<SUBTITULO>>>","<<<END_TITULO>>>"),P=v(_,"<<<EM_FACE>>>","<<<END_EM_FACE>>>"),z=v(_,"<<<I_PRELIMINARES>>>","<<<END_I>>>"),U=function(e){let t=[];for(let a of e.split("\n")){let e=a.match(/^\|(.+)\|(.+)\|\s*$/);if(!e)continue;let i=c(e[1].trim()),o=c(e[2].trim());!i||/^[-:]+$/.test(i)||/^campo$/i.test(i)||/^valor$/i.test(o)||((/data|nascimento|requer|indefer|der\.?\s*adm|req\.?\s*adm/i.test(i)||/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(o)||/^\d{4}-\d{2}-\d{2}/.test(o))&&(o=u(o)),t.push({campo:i,valor:o}))}return t}(v(_,"<<<II_QUADRO>>>","<<<END_II>>>")),F=v(_,"<<<III_SINTESE_ANTES>>>","<<<END_III_ANTES>>>"),j=function(e){try{let t=JSON.parse(e);if(!t||!Array.isArray(t.eventos))return null;let a=String(t.estilo||"horizontal").toLowerCase();return{nome:String(t.nome||"AUTORA"),atividade:String(t.atividade||"Agricultora"),local:String(t.local||""),estilo:"vertical"===a||"none"===a?a:"horizontal",eventos:t.eventos.map(e=>{let t=String(e?.data||"").trim();return{data:t?/\d/.test(t)?u(t):t:"—",titulo:String(e?.titulo||""),detalhe:String(e?.detalhe||"")}})}}catch{return null}}(v(_,"<<<TIMELINE>>>","<<<END_TIMELINE>>>")),H=v(_,"<<<III_SINTESE_DEPOIS>>>","<<<END_III_DEPOIS>>>"),q=v(_,"<<<IV_PROVAS>>>","<<<END_IV>>>").split("\n").map(e=>e.replace(/^✓\s*/,"").replace(/^[-*]\s*/,"").trim()).filter(Boolean).filter(e=>!e.startsWith("<")&&!/^#{1,6}\s/.test(e)),V=v(_,"<<<IV_FECHO>>>","<<<END_IV_FECHO>>>"),B=v(_,"<<<V_FUNDAMENTACAO>>>","<<<END_V>>>"),G=function(e){let t,a=[],i=/(?:^|\n)\s*((?:viii|vii|vi|iv|ix|iii|ii|v|i|x)+)\.\s+/gi,o=[];for(;null!==(t=i.exec(e));)o.push({num:t[1].toLowerCase(),start:t.index,bodyStart:t.index+t[0].length});for(let t=0;t<o.length;t++){let i=t+1<o.length?o[t+1].start:e.length,r=e.slice(o[t].bodyStart,i).trim();r&&a.push(`${o[t].num}. ${r}`)}return a}(v(_,"<<<VI_PEDIDOS>>>","<<<END_VI>>>")),Z=v(_,"<<<FECHAMENTO>>>","<<<END_FECHAMENTO>>>"),J=(v(_,"<<<PLANILHA>>>","<<<END_PLANILHA>>>"),G.filter(e=>!/^viii\./i.test(e.trim()))),X=G.filter(e=>/^viii\./i.test(e.trim())),W=z.match(/DA GRATUIDADE[\s\S]*/i)?.[0]||z,K=W.match(/^(DA GRATUIDADE[^:\n]*:?)/im),Q=K?.[1]||"DA GRATUIDADE DA JUSTIÇA:",Y=W.replace(/^(DA GRATUIDADE[^:\n]*:?)\s*/im,""),ee=function(e,t){let a=o(e),i=t.match(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s.]+\nOAB\/.+$/gm),r=(e,t)=>`
    <td class="sm-sign-card">
      <div class="sm-sign-line"></div>
      <div class="sm-sign-name">${b(e)}</div>
      <div class="sm-sign-oab">${b(t)}</div>
    </td>`,d="";if(i&&i.length)d=i.slice(0,2).map(e=>{let[t,a]=e.split("\n");return r(t.trim(),a.trim())}).join("");else{let t=String(e.name||"Advogado(a)"),a=String(e.oab_uf||e.estado||"").toUpperCase(),i=String(e.oab_number||"");d=r(t,`OAB/${a} n\xba ${i}`)}let l=t.replace(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s.]+\nOAB\/.+$/gm,"").replace(/^[A-Za-zÀ-ÿ ].*\/[A-Z]{2},?\s+\d{1,2}\s+de\s+\w+.*/gim,"").trim();return`
    <div class="sm-fechamento">
      ${E(l)}
      <p class="sm-local-data">${b(a)}.</p>
      <table class="sm-sign-row" cellpadding="0" cellspacing="0" width="100%">
        <tr>${d}</tr>
      </table>
    </div>
  `}(e.adv,Z),et=A(c(k||"AO JUÍZO FEDERAL DA VARA DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DA COMARCA DE [CIDADE]/[UF]")),ea=w(j),ei=!!ea.trim(),eo=c(M||"AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO-MATERNIDADE"),er=b((eo=eo.replace(/\s*SALÁRIO-MATERNIDADE\s*/gi," SALÁRIO-MATERNIDADE ")).trim()).replace(/SALÁRIO-MATERNIDADE/gi,"SALÁRIO-<br/>MATERNIDADE").replace(/SALÁRIO-\s*<br\/>\s*MATERNIDADE/gi,"SALÁRIO-<br/>MATERNIDADE"),ed=F||"";ei||(ed=ed.replace(/\s*A seguir,?\s+a linha do tempo[^\n.]*[.:]?\s*/gi," ").replace(/\s{2,}/g," ").trim());let el=`
    ${(p=String((a=e.adv).office_name||a.name||"Advocacia"),m=String(a.oab_uf||a.estado||"").toUpperCase(),g=String(a.oab_number||""),x=String(a.email||""),h=(f=a.logo_url?String(a.logo_url):"")&&f.startsWith("data:")?`<img src="${f}" class="sm-logo" width="110" height="36" alt="Logo" style="height:36px;max-width:110px;width:auto;display:block;border:0;"/>`:f?`<img src="${b(f)}" class="sm-logo" width="110" height="36" alt="Logo" style="height:36px;max-width:110px;width:auto;display:block;border:0;"/>`:`<table cellpadding="0" cellspacing="0" style="width:36px;height:36px;background:#D4AF37;"><tr><td style="width:36px;height:36px;text-align:center;vertical-align:middle;font-weight:bold;font-size:11px;color:#000;">${b(p.slice(0,2).toUpperCase())}</td></tr></table>`,D=x?`<br/><span style="font-size:9px;color:#1d4ed8;line-height:1.4;">${b(x)}</span>`:"",`
    <div class="sm-header">
      <table class="sm-header-table" cellpadding="0" cellspacing="0" width="100%" border="0" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;">
        <colgroup>
          <col style="width:130px;" />
          <col style="width:auto;" />
        </colgroup>
        <tr>
          <td width="130" valign="middle" align="left" style="width:130px;vertical-align:middle;text-align:left;padding:0;overflow:hidden;">${h}</td>
          <td valign="middle" align="right" style="vertical-align:middle;text-align:right;padding:0 0 0 10px;overflow:hidden;">
            <p align="right" style="margin:0;padding:0;text-align:right;font-family:'Times New Roman',Times,serif;">
              <span style="font-weight:bold;font-size:11.5px;text-transform:uppercase;line-height:1.35;color:#0A2540;">${b(p)}</span><br/>
              <span style="font-size:9px;color:#444;line-height:1.4;">OAB/${b(m)} n\xb0 ${b(g)}</span>${D}
            </p>
          </td>
        </tr>
      </table>
      <div class="sm-header-line"></div>
    </div>
  `)}
    <div class="sm-endereco">${b(et)}</div>
    ${(i=R.tipoAcao,d=R.juizoDigital,l=R.prioridades,y=e=>e?"(X)":"( )",T=(i||"").trim()||"SALÁRIO MATERNIDADE - SEGURADO ESPECIAL",`
    <table class="sm-meta-row" cellpadding="0" cellspacing="0">
      <tr>
        <td class="sm-meta-spacer">&nbsp;</td>
        <td class="sm-meta-cell">
          <table class="sm-meta-box" cellpadding="0" cellspacing="0">
            <tr><td class="sm-meta-inner">
              <div class="sm-meta-tipo">${b(T)}</div>
              ${!1!==d?'<div class="sm-meta-digital">JUÍZO 100% DIGITAL</div>':""}
              <div class="sm-meta-prio">
                <div class="sm-meta-prio-title">Prioridade Legal na tramita\xe7\xe3o processual:</div>
                <div class="sm-meta-prio-item">${y(l.idoso)} Idoso(a) maior de 60 anos – Lei 10.741/2003;</div>
                <div class="sm-meta-prio-item">${y(l.deficiente)} Deficiente – Lei 12.008/2009 – Laudo em anexo;</div>
                <div class="sm-meta-prio-item">${y(l.menor)} Menor nos termos do ECA – Lei 8.069/1990;</div>
              </div>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  `)}
    ${E(L,"sm-para-qualif")}
    <div class="sm-main-title">${er}</div>
    <div class="sm-sub-title">${b(c(C||"(SEGURADA ESPECIAL – AGRICULTORA)"))}</div>
    ${E(P)}
    ${$("I – PRELIMINARMENTE")}
    ${(n=c(Q),`<div class="sm-subhead keep-together">${b(n)}</div>`)}
    ${E(Y)}
    ${$("II – QUADRO SINÓPTICO")}
    ${(O=U.map((e,t)=>`
      <tr class="${t%2==0?"even":"odd"}">
        <td class="campo">${b(e.campo)}</td>
        <td class="valor">${b(e.valor)}</td>
      </tr>`).join(""),`
    <div class="sm-table-wrap keep-together">
      <div class="sm-table-caption">RESUMO DAS PRINCIPAIS INFORMA\xc7\xd5ES DO PROCESSO</div>
      <table class="sm-quadro">
        <tbody>${O}</tbody>
      </table>
    </div>
  `)}
    ${$("III – SÍNTESE DO CONTEXTO FÁTICO")}
    ${E(ed)}
    ${ei?ea:""}
    ${E(H||"")}
    ${$("IV – DAS PROVAS JUNTADAS AOS AUTOS")}
    
    <div class="sm-provas keep-together">
      <table class="sm-provas-table" cellpadding="0" cellspacing="0" width="100%">
        ${q.map((e,t)=>`
          <tr class="${t%2==0?"even":"odd"}">
            <td class="sm-check">✓</td>
            <td class="sm-prova-txt">${b(e)}</td>
          </tr>`).join("")}
      </table>
    </div>
  
    ${E(V)}
    ${$("V – FUNDAMENTAÇÃO JURÍDICA")}
    ${E(B)}
    ${$("VI – PEDIDO / REQUERIMENTOS")}
    ${I(J.length?J:G,!0)}
    ${X.length?I(X,!1):""}
    <div class="sm-fecho-bloco">
      ${ee}
      
    <div class="sm-anexo" style="margin-top:10pt;padding-top:4pt;border-top:0.5pt solid #ccc;page-break-before:auto;break-before:auto;page-break-inside:avoid;break-inside:avoid;">
      <div class="sm-anexo-title" style="margin:4px 0 10px;font-size:13px;">ANEXO – PLANILHA DE C\xc1LCULO</div>
      <div class="sm-table-wrap" style="margin:6px 0 8px;">
        <div class="sm-table-caption" style="padding:6px 10px;">PLANILHA DE C\xc1LCULO</div>
        <table class="sm-planilha" cellpadding="0" cellspacing="0" width="100%" border="0" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;">
          <colgroup>
            <col style="width:65%;" />
            <col style="width:35%;" />
          </colgroup>
          <tbody>
            <tr class="even"><td style="padding:5px 10px;color:#1a1a1a;">1\xba M\xeas de benef\xedcio</td><td align="right" style="padding:5px 10px;text-align:right;color:#1a1a1a;white-space:nowrap;">R$ 1.518,00</td></tr>
            <tr class="odd"><td style="padding:5px 10px;color:#1a1a1a;">2\xba M\xeas de benef\xedcio</td><td align="right" style="padding:5px 10px;text-align:right;color:#1a1a1a;white-space:nowrap;">R$ 1.518,00</td></tr>
            <tr class="even"><td style="padding:5px 10px;color:#1a1a1a;">3\xba M\xeas de benef\xedcio</td><td align="right" style="padding:5px 10px;text-align:right;color:#1a1a1a;white-space:nowrap;">R$ 1.518,00</td></tr>
            <tr class="odd"><td style="padding:5px 10px;color:#1a1a1a;">4\xba M\xeas de benef\xedcio</td><td align="right" style="padding:5px 10px;text-align:right;color:#1a1a1a;white-space:nowrap;">R$ 1.518,00</td></tr>
            <tr class="total"><td style="padding:5px 10px;background:#c8a951;font-weight:bold;color:#1a1a1a;">TOTAL</td><td align="right" style="padding:5px 10px;text-align:right;background:#c8a951;font-weight:bold;color:#1a1a1a;white-space:nowrap;">R$ 6.072,00</td></tr>
          </tbody>
        </table>
        <p class="sm-nota" style="margin-top:4px;">Refer\xeancia do valor: quantia devida por fato gerador (cada nascimento) — sal\xe1rio m\xednimo vigente</p>
      </div>
    </div>
  
    </div>
    ${(N=new Date().toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"}),`
    <div class="sm-doc-fecho-wrap">
      <div class="sm-doc-gerado">Documento gerado em ${b(N)} pela plataforma Marple</div>
    </div>
  `)}
  `;return`
    <style>${s=!1!==e.comMargens,`
    .pdf-page.sm-rural {
      font-family: 'Times New Roman', Times, serif;
      color: #1a1a1a;
      background: #fff;
      box-sizing: border-box;
      width: 100%;
      max-width: 794px;
      height: auto;
      min-height: 0;
      overflow: hidden;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      ${s?"padding: 3cm 2cm 2cm 3cm;":"padding: 0; box-sizing: border-box;"}
    }
    .sm-sheet {
      position: relative;
      min-height: 0;
      height: auto;
      width: 100%;
      box-sizing: border-box;
      page-break-inside: auto;
    }
    .sm-sheet-inner { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .sm-sheet-main { vertical-align: top; padding: 0; width: 100%; }
    .sm-sheet-foot { vertical-align: bottom; padding: 16px 0 0; width: 100%; }
    .sm-body { width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; }
    .sm-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    /* Evitar page-break-before no fluxo — causa p\xe1ginas em branco com html2canvas */
    .page-break-before { page-break-before: auto; break-before: auto; }
    .keep-together { page-break-inside: auto; break-inside: auto; }

    /* —— Cabe\xe7alho: TABLE logo | dados (sem flex) —— */
    .sm-header { margin-bottom: 18px; width: 100%; }
    .sm-header-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .sm-header-logo { width: 24%; vertical-align: middle; text-align: left; padding: 0 8px 0 0; }
    .sm-header-info { width: 76%; vertical-align: middle; text-align: right; padding: 0; }
    .sm-logo { height: 36px; max-height: 36px; max-width: 120px; width: auto; display: block; }
    .sm-logo-fallback {
      height: 36px; width: 36px; border-collapse: collapse;
      background: #D4AF37;
    }
    .sm-logo-fallback td {
      height: 36px; width: 36px; text-align: center; vertical-align: middle;
      font-weight: bold; font-size: 11px; color: #000;
      background: #D4AF37;
    }
    .sm-office-name {
      font-weight: bold; font-size: 11.5px; color: #0A2540;
      text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.35;
    }
    .sm-office-sub { font-size: 9px; color: #444; margin-top: 2px; line-height: 1.4; }
    .sm-office-mail { font-size: 9px; color: #1d4ed8; margin-top: 1px; }
    .sm-header-line {
      border: none; border-top: 1.5px solid #0A2540;
      margin-top: 8px; width: 100%; height: 0;
    }
    .sm-page-top-line {
      border: none; border-top: 1px solid #999;
      width: 100%; height: 0; margin: 0 0 14px;
    }

    /* —— Rodap\xe9: no fluxo do documento (sem fixed/absolute) —— */
    .sm-footer { margin-top: 0; page-break-inside: avoid; break-inside: avoid; width: 100%; }
    .sm-footer-line { border: none; border-top: 1px solid #999; width: 100%; height: 0; margin: 0 0 6px; }
    .sm-footer-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .sm-footer-left {
      text-align: left; font-weight: 600; font-size: 9px; color: #555; width: 70%;
    }
    .sm-footer-right {
      text-align: right; white-space: nowrap; font-size: 9px; color: #555; width: 30%;
    }

    .sm-endereco {
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      text-align: justify;
      margin: 22px 0 20px;
      line-height: 1.55;
      page-break-after: avoid;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow-wrap: anywhere;
      word-wrap: break-word;
    }

    /* —— Meta: tabela 2 cols + borda tracejada via border-style (sem float) —— */
    .sm-meta-row {
      width: 100%; border-collapse: collapse; table-layout: fixed;
      margin: 0 0 14px; page-break-inside: avoid;
    }
    .sm-meta-spacer { width: 46%; padding: 0; }
    .sm-meta-cell { width: 54%; padding: 0; vertical-align: top; text-align: left; }
    table.sm-meta-box {
      width: 100%; border-collapse: collapse;
      border: 1.5px dashed #0A2540;
      background: #ffffff;
    }
    .sm-meta-inner {
      padding: 10px 12px;
      font-size: 9.5px;
      line-height: 1.5;
      text-align: left;
      vertical-align: top;
      color: #1a1a1a;
      overflow-wrap: anywhere;
      word-wrap: break-word;
      max-width: 100%;
    }
    .sm-meta-tipo {
      font-weight: bold; font-size: 10.5px; color: #0A2540;
      text-transform: uppercase; margin-bottom: 4px; line-height: 1.35;
      overflow-wrap: anywhere; word-wrap: break-word;
    }
    .sm-meta-digital {
      font-weight: bold; font-size: 10.5px; color: #0A2540; margin-bottom: 8px;
    }
    .sm-meta-prio {
      border-top: 1px dashed #999; padding-top: 6px; margin-top: 4px;
    }
    .sm-meta-prio-title {
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 5px;
      font-size: 9.5px;
    }
    .sm-meta-prio-item { margin: 2px 0; line-height: 1.4; }

    .sm-main-title {
      text-align: center; font-weight: bold; font-size: 14px;
      text-transform: uppercase; color: #0A2540; margin: 16px 0 4px;
      page-break-after: avoid;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
      line-height: 1.45;
      overflow-wrap: anywhere;
      word-break: normal;
      hyphens: none;
    }
    .sm-sub-title {
      text-align: center; font-size: 12px; font-weight: bold;
      margin: 0 0 14px; page-break-after: avoid;
    }

    .sm-section-bar {
      background: #2d5f8a;
      color: #fff;
      font-weight: bold;
      font-size: 12px;
      padding: 8px 14px;
      margin: 18px 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      width: 100%;
      box-sizing: border-box;
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    .sm-subhead {
      font-weight: bold;
      font-size: 11.5px;
      color: #1a1a1a;
      margin: 10px 0 8px;
      padding: 0;
      background: none;
      border: none;
      page-break-after: avoid;
    }

    .sm-para {
      font-size: 11.5px;
      line-height: 1.65;
      text-align: justify;
      text-indent: 1.25cm;
      margin: 0 0 10px;
      width: 100%;
      box-sizing: border-box;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .sm-para-qualif { text-indent: 1.25cm; }

    .sm-table-wrap { margin: 10px 0 16px; page-break-inside: avoid; width: 100%; box-sizing: border-box; }
    .sm-table-caption {
      background: #1a3a5c;
      color: #fff;
      font-weight: bold;
      font-size: 10.5px;
      text-transform: uppercase;
      padding: 8px 10px;
      text-align: center;
      width: 100%;
      box-sizing: border-box;
    }
    table.sm-quadro, table.sm-planilha {
      width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed;
    }
    table.sm-quadro td, table.sm-planilha td {
      padding: 7px 10px; border-bottom: 1px solid #dde3ec; vertical-align: top;
    }
    table.sm-quadro tr.even td, table.sm-planilha tr.even td { background: #f5f5f5; }
    table.sm-quadro tr.odd td, table.sm-planilha tr.odd td { background: #ffffff; }
    table.sm-quadro td.campo { font-weight: bold; width: 42%; color: #1a1a1a; }
    table.sm-quadro td.valor { font-weight: normal; width: 58%; }
    table.sm-planilha td.num { text-align: right; white-space: nowrap; width: 35%; }
    table.sm-planilha tr.total td {
      background: #c8a951 !important;
      font-weight: bold;
      color: #1a1a1a;
    }
    .sm-nota {
      font-size: 9.5px; font-style: italic; color: #555;
      margin-top: 8px; text-align: center;
    }
    .sm-anexo-title {
      text-align: center; font-weight: bold; font-size: 14px;
      text-transform: uppercase; margin: 8px 0 16px; color: #0A2540;
      background: none; padding: 0;
    }

    .sm-timeline { margin: 14px 0 18px; page-break-inside: auto; }
    .sm-timeline svg { display: block; width: 100%; height: auto; }
    .sm-timeline-vertical { background: #EEF1F5; border: 1px solid #D0D7E2; padding: 12px 14px; }
    .sm-tl-title { font-weight: bold; font-size: 11.5px; color: #0A2540; margin-bottom: 10px; text-transform: uppercase; }
    .sm-tl-table { width: 100%; border-collapse: collapse; }
    .sm-tl-table td { padding: 8px 6px; vertical-align: top; border-bottom: 1px solid #d8dee8; }
    .sm-tl-num {
      font-weight: bold; color: #fff; background: #0A2540;
      text-align: center; width: 22px; height: 22px;
      line-height: 22px; font-size: 11px;
    }
    .sm-tl-data { width: 110px; font-size: 10.5px; color: #555; white-space: nowrap; }
    .sm-tl-titulo { font-weight: bold; font-size: 11.5px; color: #0A2540; }
    .sm-tl-detalhe { font-size: 10px; color: #666; margin-top: 2px; }

    .sm-provas { margin: 8px 0; }
    table.sm-provas-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.sm-provas-table tr.even td { background: #f5f5f5; }
    table.sm-provas-table tr.odd td { background: #fff; }
    table.sm-provas-table td { padding: 6px 10px; font-size: 11.5px; vertical-align: top; }
    table.sm-provas-table td.sm-check {
      color: #15803d; font-weight: bold; width: 22px; text-align: center;
    }
    table.sm-provas-table td.sm-prova-txt { width: auto; }

    .sm-pedidos-list { list-style: none; padding: 0; margin: 8px 0 0; }
    .sm-pedidos-list li,
    table.sm-pedido-item {
      font-size: 11.5px; line-height: 1.6; text-align: justify;
      margin: 0 0 10px;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .sm-pedidos-intro { margin-bottom: 8px; }
    .sm-rom { font-weight: bold; margin-right: 4px; }

    .sm-fechamento { margin-top: 18px; }
    .sm-fecho-bloco { page-break-inside: auto; break-inside: auto; }
    .sm-local-data { text-align: right; font-size: 12px; margin: 14px 0 16px; font-weight: 500; }
    table.sm-sign-row {
      width: 100%; border-collapse: collapse; table-layout: fixed;
      margin-top: 8px; page-break-inside: avoid;
    }
    td.sm-sign-card { text-align: center; vertical-align: top; padding: 0 12px; width: 50%; }
    .sm-sign-line { border-top: 1px solid #222; margin: 0 8px 8px; height: 0; }
    .sm-sign-name { font-weight: bold; font-size: 11.5px; text-transform: uppercase; }
    .sm-sign-oab { font-size: 10px; color: #333; margin-top: 2px; }

    .sm-doc-fecho-wrap {
      margin-top: 48pt;
      padding-top: 24pt;
      min-height: 72pt;
      width: 100%;
      box-sizing: border-box;
    }
    .sm-doc-gerado {
      text-align: center;
      font-size: 9px;
      color: #888;
      font-style: italic;
      border-top: 0.5pt solid #ddd;
      padding-top: 10pt;
      line-height: 1.4;
    }
  `}</style>
    <div class="pdf-page sm-rural">
      ${el}
    </div>
  `}e.s(["AGENT_SM_RURAL",0,h,"injetarTimelineNoTexto",0,function(e,t){let a=JSON.stringify({nome:t.nome,atividade:t.atividade,local:t.local,estilo:t.estilo||"horizontal",eventos:t.eventos},null,2),i=`<<<TIMELINE>>>
${a}
<<<END_TIMELINE>>>`;return/<<<TIMELINE>>>[\s\S]*?<<<END_TIMELINE>>>/.test(e)?e.replace(/<<<TIMELINE>>>[\s\S]*?<<<END_TIMELINE>>>/,i):e.includes("<<<III_SINTESE_DEPOIS>>>")?e.replace("<<<III_SINTESE_DEPOIS>>>",`${i}

<<<III_SINTESE_DEPOIS>>>`):`${e.trim()}

${i}
`},"isSmRuralStructured",0,S,"montarHtmlSmRural",0,D,"montarTimelineDataPadrao",0,function(e,t="horizontal"){let a,i,o=[(e.cidade||"").trim(),(e.estado||e.uf||"").trim()].filter(Boolean).join("/");if(!o&&(e.endereco||"").trim()){let t=e.endereco.match(/([A-Za-zÀ-ú\s]+)\s*\/\s*([A-Z]{2})\s*$/);t&&(o=`${t[1].trim()}/${t[2]}`)}return{nome:(e.nome||"AUTORA").trim()||"AUTORA",atividade:(e.atividade||e.ocupacao||"Agricultora").trim()||"Agricultora",local:o,estilo:t,eventos:(a=[],(i=(e.periodo_segurado||"").trim())&&a.push({data:"Infância / juventude",titulo:"Início do labor rural",detalhe:i}),(e.data_nascimento_crianca||"").trim()&&a.push({data:u(e.data_nascimento_crianca.trim()),titulo:"Nascimento do(a) filho(a)",detalhe:e.nome_crianca?`Crian\xe7a: ${e.nome_crianca}`:""}),(e.data_requerimento||"").trim()&&a.push({data:u(e.data_requerimento.trim()),titulo:"Requerimento administrativo",detalhe:e.nb?`NB ${e.nb}`:"Pedido de salário-maternidade"}),(e.data_indeferimento||"").trim()&&a.push({data:u(e.data_indeferimento.trim()),titulo:"Indeferimento pelo INSS",detalhe:(e.motivo_inss||"").trim().slice(0,80)}),a.push({data:new Date().toLocaleDateString("pt-BR"),titulo:"Ajuizamento da ação",detalhe:"Petição inicial — JEF"}),a.length?a:[{data:"—",titulo:"Evento 1",detalhe:""},{data:"—",titulo:"Evento 2",detalhe:""}])}},"renderTimelineHtml",0,w,"slugArquivoPeticaoSm",0,function(e){let t=String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").replace(/-{2,}/g,"-");return`peticao-salario-maternidade-${t||"cliente"}`},"textoRodapeSm",0,function(e){let t=String(e.office_name||e.name||"Advocacia").trim(),{localFormatado:a}=i(e),o=t.toUpperCase();return a?`${o} | ${a}`:o}],964077),e.s(["montarHtmlPeticao",0,function(e){if(e.agentType===h||S(e.text)){let t=D({text:e.text,adv:e.adv,comMargens:e.comMargens,estilo:e.estilo});if(t)return t}return f(e)}],274246)},545481,e=>{"use strict";var t=e.i(632412),a=e.i(431690),i=e.i(874948),o=e.i(529487),r=e.i(274246);let d=`<<<SM_RURAL_V2>>>
<<<META>>>
tipo_acao: SAL\xc1RIO MATERNIDADE - SEGURADO ESPECIAL
juizo_digital: true
prioridade_idoso: false
prioridade_deficiente: false
prioridade_menor: false
<<<END_META>>>

<<<ENDERECO>>>
AO JU\xcdZO FEDERAL DA VARA DO JUIZADO ESPECIAL FEDERAL DA SUBSE\xc7\xc3O JUDICI\xc1RIA DA COMARCA DE S\xc3O LU\xcdS/MA
<<<END_ENDERECO>>>

<<<QUALIFICACAO>>>
ANA L\xdaCIA FERREIRA, brasileira, agricultora, nascida em 15/03/1995, RG 1234567 SSP/MA, CPF 000.000.000-00, residente e domiciliada na Zona Rural, Munic\xedpio de S\xe3o Lu\xeds/MA, por interm\xe9dio de seus procuradores, vem, respeitosamente, \xe0 presen\xe7a de Vossa Excel\xeancia, propor a presente
<<<END_QUALIFICACAO>>>

<<<TITULO>>>
A\xc7\xc3O PREVIDENCI\xc1RIA DE CONCESS\xc3O DE SAL\xc1RIO-MATERNIDADE
<<<SUBTITULO>>>
(SEGURADA ESPECIAL – AGRICULTORA)
<<<END_TITULO>>>

<<<EM_FACE>>>
Em face do INSTITUTO NACIONAL DO SEGURO SOCIAL – INSS, autarquia federal, a ser citado na Procuradoria Federal na comarca de S\xe3o Lu\xeds/MA.
<<<END_EM_FACE>>>

<<<I_PRELIMINARES>>>
DA GRATUIDADE DA JUSTI\xc7A:
A autora declara hipossufici\xeancia nos termos do art. 5\xba, LXXIV, da CF/88 e da Lei 1.060/50, requerendo os benef\xedcios da justi\xe7a gratuita.
<<<END_I>>>

<<<II_QUADRO>>>
| Campo | Valor |
| --- | --- |
| Nome | ANA L\xdaCIA FERREIRA |
| Idade no Req. Adm. | 29 |
| Pedido | Sal\xe1rio-Maternidade – Segurado Especial |
| Crian\xe7a | Jo\xe3o Ferreira |
| Data de Nascimento | 10/01/2025 |
| Data do Req. Adm. | 20/02/2025 |
| NB | 123.456.789-0 |
| Situa\xe7\xe3o/Decis\xe3o INSS | Indeferido |
| Data do Indef. Adm. | 15/03/2025 |
| Motivo INSS | Aus\xeancia de qualidade de segurado especial |
| Tempo de trabalho antes do parto | Mais de 12 meses |
| Per\xedodo de Segurado Especial declarado | 2018 a 2025 |
| Ponto controvertido | Qualidade de segurada especial |
| Benef\xedcio anterior | N\xe3o consta |
| Per\xedodo averbado no CNIS | N\xe3o consta |
| V\xednculo urbano | N\xe3o possui |
<<<END_II>>>

<<<III_SINTESE_ANTES>>>
A autora labora em regime de economia familiar na zona rural do munic\xedpio, dedicando-se ao cultivo de mandioca e milho, sem empregados permanentes.

Sustenta a fam\xedlia com o produto da lavoura, em condi\xe7\xe3o t\xedpica de segurada especial.
<<<END_III_ANTES>>>

<<<TIMELINE>>>
{"nome":"ANA L\xdaCIA FERREIRA","atividade":"Agricultora","local":"S\xe3o Lu\xeds/MA","estilo":"none","eventos":[]}
<<<END_TIMELINE>>>

<<<III_SINTESE_DEPOIS>>>
Em 10/01/2025 nasceu o filho da autora. Durante o per\xedodo gestacional manteve-se no trabalho rural. Requereu administrativamente o sal\xe1rio-maternidade, indeferido pelo INSS sem lastro f\xe1tico adequado.
<<<END_III_DEPOIS>>>

<<<IV_PROVAS>>>
✓ Certid\xe3o de nascimento do filho
✓ Documentos de identifica\xe7\xe3o da autora
✓ Declara\xe7\xe3o de exerc\xedcio de atividade rural
✓ Notas fiscais de produtor
✓ Contratos de parceria agr\xedcola
<<<END_IV>>>

<<<IV_FECHO>>>
As provas materiais, conjugadas com a prova testemunhal a ser produzida em audi\xeancia, comprovam o exerc\xedcio de atividade rural em regime de economia familiar e o preenchimento da car\xeancia.
<<<END_IV_FECHO>>>

<<<V_FUNDAMENTACAO>>>
O sal\xe1rio-maternidade do segurado especial encontra amparo no art. 71 e no art. 39, par\xe1grafo \xfanico, da Lei 8.213/91, bem como no art. 7\xba, XVIII, da CF/88.

O STF, nas ADIs 2110 e 2111 (28/03/2024), reafirmou a prote\xe7\xe3o \xe0 maternidade.

A jurisprud\xeancia do STJ, dos TRFs e da TNU \xe9 firme no sentido de que a prova material contempor\xe2nea, ainda que escassa, pode ser complementada por prova testemunhal.
<<<END_V>>>

<<<VI_PEDIDOS>>>
i. Que todas as comunica\xe7\xf5es processuais sejam feitas em nome dos advogados constitu\xeddos, nos termos do art. 272, \xa75\xba, do CPC
ii. A proced\xeancia do pedido, com a concess\xe3o do sal\xe1rio-maternidade
iii. A averba\xe7\xe3o do per\xedodo no CNIS
iv. A cita\xe7\xe3o da r\xe9 e a juntada do processo administrativo NB
v. O pagamento de 120 dias de benef\xedcio, com corre\xe7\xe3o monet\xe1ria e juros
vi. A designa\xe7\xe3o de audi\xeancia UNA
vii. A concess\xe3o da justi\xe7a gratuita
viii. O destaque de honor\xe1rios contratuais de 30% em favor do escrit\xf3rio
<<<END_VI>>>

<<<FECHAMENTO>>>
Protesta o alegado por todos os meios admitidos em direito, especialmente o depoimento pessoal da parte autora e das testemunhas que comparecer\xe3o em audi\xeancia, independente de intima\xe7\xe3o.

D\xe1-se \xe0 causa o valor de R$ 6.072,00 (seis mil e setenta e dois reais), renunciando-se a eventual excedente da al\xe7ada do Juizado Especial Federal, especificamente para fins de fixa\xe7\xe3o da compet\xeancia.

Termos em que, pede e espera deferimento.

ADVOGADO TESTE
OAB/MA n\xba 12345
<<<END_FECHAMENTO>>>

<<<PLANILHA>>>
| Campo | Valor |
| --- | --- |
| 1\xba M\xeas de benef\xedcio | R$ 1.518,00 |
| 2\xba M\xeas de benef\xedcio | R$ 1.518,00 |
| 3\xba M\xeas de benef\xedcio | R$ 1.518,00 |
| 4\xba M\xeas de benef\xedcio | R$ 1.518,00 |
| TOTAL | R$ 6.072,00 |
<<<END_PLANILHA>>>
`;var l=e.i(964077),n=e.i(688438);let s={name:"Prev Labs",office_name:"Prev Labs",oab_number:"12345",oab_uf:"MA",email:"contato@prevlabs.com.br",cidade:"São Luís",estado:"MA",logo_url:null,cor_peticao:"#0A2540",estilo_peticao:"moderno"};async function p(){let e=n.A4_WIDTH_PX,t=(0,r.montarHtmlPeticao)({text:d,adv:s,estilo:"moderno",corPeticao:"#0A2540",comMargens:!0,agentType:l.AGENT_SM_RURAL}),a=[];a.push(t.includes("R$ 1.518,00")?"HTML planilha OK":"HTML planilha FALHOU"),a.push(t.includes("SALÁRIO-<br/>MATERNIDADE")?"HTML título OK":"HTML título FALHOU"),a.push(t.includes("contato@prevlabs.com.br")?"HTML cabeçalho OK":"HTML cabeçalho FALHOU"),a.push(/<div class="sm-footer[\s"]/.test(t)?"HTML rodapé inline FALHOU":"HTML sem rodapé inline OK"),a.push(/<div class="sm-timeline[\s"]/.test(t)?"HTML timeline FALHOU":"HTML sem timeline OK");let p=(t.match(/R\$ 1\.518,00/g)||[]).length>=4;a.push(p?"Valores R$ 1.518,00 ×4 no HTML":"Valores planilha ausentes");let c=document.createElement("div");c.style.cssText=`position:fixed;left:-10000px;top:0;width:${e}px;max-width:${e}px;overflow:hidden;background:#fff;box-sizing:border-box;`,c.innerHTML=t,document.body.appendChild(c);try{let t=c.querySelector(".pdf-page")||c;t.style.setProperty("width",`${e}px`,"important"),t.style.setProperty("max-width",`${e}px`,"important"),t.style.setProperty("overflow","hidden","important"),t.style.setProperty("box-sizing","border-box","important"),await new Promise(e=>requestAnimationFrame(()=>requestAnimationFrame(()=>e())));let r=await (0,o.default)(t,{scale:2,width:e,windowWidth:e,useCORS:!0,allowTaint:!0,backgroundColor:"#ffffff",logging:!1,scrollX:0,scrollY:0,x:0,y:0,onclone:(t,a)=>{a.style.setProperty("width",`${e}px`,"important"),a.style.setProperty("max-width",`${e}px`,"important"),a.style.setProperty("overflow","hidden","important")}});a.push(4>=Math.abs(r.width-2*e)?`Canvas width OK (${r.width})`:`Canvas width FALHOU (${r.width}, esperado ${2*e})`);let d=r,p=2*e;if(r.width>p+2){let e=document.createElement("canvas");e.width=p,e.height=r.height;let t=e.getContext("2d");t.fillStyle="#fff",t.fillRect(0,0,p,r.height),t.drawImage(r,0,0),d=e}let m=new i.jsPDF({orientation:"portrait",unit:"pt",format:"a4"}),g=m.internal.pageSize.getWidth(),x=m.internal.pageSize.getHeight();a.push(1>Math.abs(g-595.28)&&1>Math.abs(x-841.89)?`A4 OK (${g.toFixed(1)}\xd7${x.toFixed(1)} pt)`:`A4 FALHOU (${g}\xd7${x})`);let f=x-22,h=d.width/g,b=Math.floor(f*h),u=0,v=0,A="",E="";for(;u<d.height-1;){let e=Math.min(b,d.height-u);if(e<8)break;let t=document.createElement("canvas");t.width=d.width,t.height=e;let a=t.getContext("2d");a.fillStyle="#fff",a.fillRect(0,0,t.width,t.height),a.drawImage(d,0,u,d.width,e,0,0,d.width,e);let i=t.toDataURL("image/jpeg",.85);0===v&&(A=i),E=i,v>0&&m.addPage(),m.addImage(t.toDataURL("image/jpeg",.92),"JPEG",0,0,g,e/h),u+=e,v++}return!function(e){let t=e.internal.pageSize.getWidth(),a=e.internal.pageSize.getHeight(),i=(0,l.textoRodapeSm)(s),o=e.getNumberOfPages(),r=a-n.MARGEM_PETICAO_PT.bottom+10,d=r+12;for(let a=1;a<=o;a++)e.setPage(a),e.setDrawColor(153,153,153),e.setLineWidth(.4),e.line(n.MARGEM_PETICAO_PT.left,r,t-n.MARGEM_PETICAO_PT.right,r),e.setFont("helvetica","normal"),e.setFontSize(8),e.setTextColor(85,85,85),e.text(i,n.MARGEM_PETICAO_PT.left,d),e.text(`P\xe1g. ${a}`,t-n.MARGEM_PETICAO_PT.right,d,{align:"right"})}(m),a.push(`P\xe1ginas: ${m.getNumberOfPages()}`),{blob:m.output("blob"),checks:a,page1DataUrl:A,lastPageDataUrl:E||A}}finally{c.remove()}}e.s(["default",0,function(){let[e,i]=(0,a.useState)("Pronto"),[o,r]=(0,a.useState)([]),[d,l]=(0,a.useState)(null),[n,s]=(0,a.useState)(null),[c,m]=(0,a.useState)(null),g=(0,a.useCallback)(async()=>{i("Gerando…");try{let{blob:e,checks:t,page1DataUrl:a,lastPageDataUrl:o}=await p();r(t),s(a||null),m(o||null);let d=URL.createObjectURL(e);l(e=>(e&&URL.revokeObjectURL(e),d));let n=await fetch("/api/dev/save-pdf",{method:"POST",body:e,headers:{"Content-Type":"application/pdf"}}),c=await n.json();i(n.ok?`Salvo: ${c.path} (${c.bytes} bytes)`:`Erro save: ${JSON.stringify(c)}`),window.__PDF_TEST_OK__=n.ok,window.__PDF_CHECKS__=t}catch(e){i(`Erro: ${e instanceof Error?e.message:String(e)}`)}},[]);return(0,t.jsxs)("div",{style:{padding:24,fontFamily:"system-ui",maxWidth:720},children:[(0,t.jsx)("h1",{style:{fontSize:18,marginBottom:8},children:"Teste PDF — SM Rural (Ana Lúcia)"}),(0,t.jsx)("p",{style:{fontSize:13,color:"#555",marginBottom:16},children:"Timeline: none · Planilha estática R$ 1.518,00 · Cabeçalho Prev Labs"}),(0,t.jsx)("button",{type:"button",id:"btn-gerar-pdf-teste",onClick:g,style:{padding:"10px 16px",background:"#0A2540",color:"#fff",border:0,borderRadius:8,cursor:"pointer",fontWeight:600},children:"Gerar PDF de teste"}),(0,t.jsx)("p",{id:"pdf-status",style:{marginTop:12,fontSize:13},children:e}),(0,t.jsx)("ul",{style:{marginTop:8,fontSize:12,lineHeight:1.6},children:o.map(e=>(0,t.jsx)("li",{children:e},e))}),n?(0,t.jsx)("img",{id:"pdf-page1-preview",src:n,alt:"Página 1 do PDF",style:{width:420,marginTop:16,border:"1px solid #ccc",display:"block"}}):null,c?(0,t.jsx)("img",{id:"pdf-last-preview",src:c,alt:"Última página do PDF",style:{width:420,marginTop:16,border:"1px solid #ccc",display:"block"}}):null,d?(0,t.jsx)("iframe",{title:"Prévia PDF",src:d,style:{width:"100%",height:"70vh",marginTop:16,border:"1px solid #ccc"}}):null]})}],545481)},483578,e=>{e.v(t=>Promise.all(["static/chunks/40jlihxxmdzcd.js"].map(t=>e.l(t))).then(()=>t(553055)))},521599,e=>{e.v(e=>Promise.resolve().then(()=>e(529487)))},894400,e=>{e.v(t=>Promise.all(["static/chunks/3y6scux0iii69.js"].map(t=>e.l(t))).then(()=>t(21749)))}]);