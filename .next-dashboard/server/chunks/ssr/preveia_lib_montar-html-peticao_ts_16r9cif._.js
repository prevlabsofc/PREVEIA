module.exports=[261461,193963,358275,a=>{"use strict";let b=72/2.54;function c(a){return"classico"===a?"classico":"moderno"}function d(a){let b=String(a?.cidade||a?.city||"").trim(),c=String(a?.estado||a?.state||a?.oab_uf||"").trim().toUpperCase();return(b||c&&"MA"!==c||(b="São Luís",c="MA"),b&&c)?{cidade:b,uf:c,localFormatado:`${b}/${c}`}:b?{cidade:b,uf:c,localFormatado:b}:c?{cidade:"",uf:c,localFormatado:`[Cidade]/${c}`}:{cidade:"São Luís",uf:"MA",localFormatado:"São Luís/MA"}}function e(a,b=new Date){let{localFormatado:c}=d(a),f=function(a=new Date){return a.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"})}(b);return`${c}, ${f}`}function f(a,b){let{cidade:c,uf:e,localFormatado:f}=d(b);if(!e)return a;let g=a,h=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return g=g.replace(RegExp(`(^|\\n)(\\*{0,2})${h},(\\s+\\d{1,2}\\s+de\\s+[A-Za-z\xe7\xc7\xe1\xe9\xed\xf3\xfa\xe3\xf5\xe2\xea\xf4\xe0\xfc]+\\s+de\\s+\\d{4})`,"gi"),`$1$2${f},$3`),g=c?g.replace(RegExp(`(^|[^A-Za-z\xc0-\xff0-9])\\/${h}\\b`,"g"),`$1${f}`):g.replace(RegExp(`(^|[^A-Za-z\xc0-\xff0-9\\]])\\/${h}\\b`,"g"),`$1[Cidade]/${e}`)}function g(a){return a.replace(/^#{1,6}\s+/,"").replace(/^\*{1,2}/,"").replace(/\*{1,2}$/,"").replace(/^[IVXLC]+[.\-–—)\s:]+/i,"").replace(/^\d+(\.\d+)*[.\-–—)\s]+/,"").trim().toLowerCase().replace(/\s+/g," ")}function h(a){let b=a.trim();return/^#{1,6}\s+\S/.test(b)||/^\*{0,2}\d+(\.\d+)*\s+[A-ZÀ-Ÿ]/.test(b)||/^\*{0,2}[IVXLC]+\s*[–—\-.:)]\s+\S/.test(b)}function i(a){let b=a.match(/^(#{1,6})\s/);return b?b[1].length:/^\*{0,2}\d+\.\d+/.test(a.trim())?3:(/^\*{0,2}\d+\s/.test(a.trim()),2)}function j(a){let b=a.split("\n"),c=[];for(let a=0;a<b.length;a++){let d=b[a],e=b[a+1];if(h(d)&&e&&h(e)&&g(d)===g(e)&&g(d).length>3){i(d)<=i(e)&&(c.push(d),a++);continue}c.push(d)}let d=[];for(let a=0;a<c.length;a++){let b=d[d.length-1],e=c[a];b&&h(b)&&e.trim()&&g(b)===g(e)&&g(b).length>3||d.push(e)}return d.join("\n")}function k(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function l(a){return a.replace(/^#{1,6}\s+/gm,"").replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/__(.+?)__/g,"$1").replace(/_(.+?)_/g,"$1").replace(/`([^`]+)`/g,"$1")}function m(a){let b=a.search(/\n(?:(?:Nestes termos|Termos em que)[,.]?\s*\n+)?(?:Pede deferimento\.?)/i);if(-1===b){let b=a.search(/\n\*{0,2}[A-Za-zÀ-ÿ ].*\/[A-Z]{2},?\s+\d{1,2}\s+de\s+\w+/i);return -1===b?a:n(a,b)}return n(a,b)}function n(a,b){let c=a.length,d=a.slice(b).search(/\n(?:>\s|Esta petição foi elaborada|\*{0,2}"A proteção)/i);return d>0&&(c=b+d),`${a.slice(0,b)}

<<<CLOSING>>>
${a.slice(b+1,c)}
<<<END_CLOSING>>>${a.slice(c)}`}let o=/(S[IÍ]NTESE|QUADRO\s+SIN[OÓ]PTICO|PROVAS\s+JUNTADAS|FUNDAMENTA[CÇ][AÃ]O|DOS?\s+PEDIDOS?|PRELIMINARMENTE|PLANILHA|FUMUS|PERICULUM)/i;function p(a){var b;let d,e,g,h,i,n,p,q=c(a.estilo),r=a.corPeticao||String(a.adv.cor_peticao||"#1d4ed8"),s=function(a,b={}){let d=c(b.estilo),e=f(a,b.adv);e=m(e=j(e));let g=RegExp("\\|(.+)\\|\\n\\|[-:\\s|]+\\|\\n((?:\\|.+\\|\\n?)+)","g");e=(e=(e=e.replace(g,(a,b,c)=>{let d=b.split("|").map(a=>a.trim()).filter(Boolean),e=c.trim().split("\n").map(a=>a.split("|").map(a=>a.trim()).filter(Boolean)),f='<div class="doc-table-wrap keep-together"><table class="doc-table"><thead><tr>';return d.forEach(a=>{f+=`<th>${k(l(a))}</th>`}),f+="</tr></thead><tbody>",e.forEach((a,b)=>{f+=`<tr class="${b%2==0?"even":"odd"}">`,a.forEach(a=>{f+=`<td>${k(l(a))}</td>`}),f+="</tr>"}),f+="</tbody></table></div>"})).replace(/<<<CLOSING>>>\n?/g,'<div class="closing-block keep-together">')).replace(/<<<END_CLOSING>>>/g,"</div>");let h=a=>k(l(String(a)));return(e=(e=(e=(e=(e=(e=function(a){let b=a.split(/(<div class="doc-box keep-together">)/);if(1===b.length)return a;let c=b[0];for(let a=1;a<b.length;a++)if('<div class="doc-box keep-together">'===b[a]){let d=b[a+1]||"",e=d.search(/<div class="(?:section-bar|section-classic|main-title|closing-block|doc-box)/);-1===e?c+=`<div class="doc-box keep-together">${d}</div>`:c+=`<div class="doc-box keep-together">${d.slice(0,e)}</div>${d.slice(e)}`,a++}else c+=b[a];return c}(e=(e=(e=(e=(e=(e=(e=(e=e.replace(/^#### (.+)$/gm,(a,b)=>`<div class="sub-sub-title">${h(b)}</div>`)).replace(/^### (.+)$/gm,(a,b)=>`<div class="sub-title">${h(b)}</div>`)).replace(/^## (.+)$/gm,(a,b)=>{let c=l(String(b)),e=o.test(c),f=`<div class="${"classico"===d?"section-classic":"section-bar"}${e?" doc-box-title":""}">${k(c)}</div>`;return e?`<<<BOX_START>>>${f}`:f})).replace(/^# (.+)$/gm,(a,b)=>`<div class="main-title">${h(b)}</div>`)).replace(/^(\*{0,2})(\d+\.\d+(?:\.\d+)*)\s+(.+?)(\*{0,2})$/gm,(a,b,c,d)=>{let e=`${c} ${l(String(d))}`,f=/fumus|periculum/i.test(e)?" keep-together":"";return`<div class="sub-title${f}">${k(e)}</div>`})).replace(/^(\*{0,2})(Fumus\s+boni\s+iuris(?:\s*[\/·–—-]\s*Periculum\s+in\s+mora)?|Periculum\s+in\s+mora)(\*{0,2})\s*$/gim,(a,b,c)=>`<div class="sub-title keep-together">${k(l(String(c)))}</div>`)).replace(/^(\*{0,2})(\d+)\.\s+([A-ZÀ-Ÿ].+?)(\*{0,2})$/gm,(a,b,c,e)=>{let f=`${c}. ${l(String(e))}`,g=o.test(f),h=`<div class="${"classico"===d?"section-classic":"section-bar"}${g?" doc-box-title":""}">${k(f)}</div>`;return g?`<<<BOX_START>>>${h}`:h})).replace(/<<<BOX_START>>>/g,'<div class="doc-box keep-together">'))).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")).replace(/\*(.+?)\*/g,"<em>$1</em>")).replace(/^---$/gm,'<hr class="divider"/>')).replace(/^✓ (.+)$/gm,'<div class="proof-item"><span class="check">✓</span>$1</div>')).replace(/^>\s?(.+)$/gm,'<blockquote class="doc-quote">$1</blockquote>')).split("\n\n").map(a=>a.startsWith("<")||a.includes("<div")?a:a.trim()?/<(?:div|table|hr|blockquote)/.test(a)?a.split("\n").map(a=>a.trim()?a.startsWith("<")?a:`<p class="doc-para">${a}</p>`:"").join(""):`<p class="doc-para">${a.replace(/\n/g,"<br/>")}</p>`:"").join("")}(a.text,{estilo:q,adv:a.adv}),t=String(a.adv.office_name||a.adv.name||"Advogado");return`
    <style>${function(a){let{estilo:b,corPeticao:c}=a,d="moderno"===b,e=!1!==a.comMargens?"padding: 3cm 2cm 2cm 3cm;":"padding: 0;";return`
    .pdf-page {
      font-family: 'Times New Roman', Times, serif;
      color: #1a1a1a;
      ${e}
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
    .pdf-header .office-mail { font-size: 10px; color:${d?"#1d4ed8":"#333"}; margin-top:1px; }
    .section-bar { background: linear-gradient(135deg, ${c}, ${c}cc); color: #fff; font-weight: bold; font-size: 13px; padding: 8px 14px; margin: 22px 0 14px; border-left: 5px solid #D4AF37; text-transform: uppercase; letter-spacing: 0.5px; page-break-after: avoid; break-after: avoid; }
    .section-classic { color: #000; font-weight: bold; font-size: 13px; padding: 4px 0; margin: 22px 0 10px; text-transform: uppercase; text-decoration: underline; letter-spacing: 0.3px; border: none; background: none; page-break-after: avoid; break-after: avoid; }
    .sub-title { font-weight: bold; font-size: 12px; text-decoration: underline; margin: 14px 0 6px 16px; color:${d?"#0A2540":"#000"}; page-break-after: avoid; break-after: avoid; }
    .sub-sub-title { font-weight: bold; font-size: 11px; margin: 10px 0 4px 28px; color:#000; page-break-after: avoid; break-after: avoid; }
    .main-title { text-align:center; font-weight:bold; font-size:15px; text-transform:uppercase; margin: 18px 0; color:${d?"#0A2540":"#000"}; page-break-after: avoid; break-after: avoid; }
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
    strong { color: ${d?"#0A2540":"#000"}; }
    .divider { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
    table.doc-table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; font-size: 11px; }
    table.doc-table th { background: ${d?"#0A2540":"#000"}; color: #fff; padding: 7px 10px; text-align:left; font-size:10px; text-transform:uppercase; }
    table.doc-table td { padding: 6px 10px; border-bottom: 1px solid #e5e5e5; }
    table.doc-table tr.even td { background: ${d?"#f4f6f9":"#f5f5f5"}; }
    .proof-item { display:flex; align-items:center; gap:8px; font-size:12px; padding:6px 10px; margin-bottom:4px; background:${d?"#f8f8f8":"transparent"}; border-left: 3px solid ${d?"#D4AF37":"#000"}; page-break-inside: avoid; break-inside: avoid; }
    .proof-item .check { color:${d?"#D4AF37":"#000"}; font-weight:bold; }
    .doc-box { ${d?"border: 1px solid #c5d0e0; background: #f8fafc; padding: 12px 14px; margin: 16px 0; border-radius: 4px;":"border: 1px solid #000; background: transparent; padding: 10px 12px; margin: 16px 0;"}
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
  `}({estilo:q,corPeticao:r,comMargens:a.comMargens})}</style>
    <div class="pdf-page">
      ${d=String((b=a.adv).office_name||b.name||"Advogado"),e=String(b.oab_uf||b.estado||"").toUpperCase(),g=String(b.oab_number||""),h=String(b.email||""),i=String(b.whatsapp||b.phone||""),n=b.banner_url?`<img src="${k(String(b.banner_url))}" class="pdf-banner" alt="Timbre"/>`:"",p=b.logo_url?`<img src="${k(String(b.logo_url))}" class="logo" alt="Logo"/>`:'<img src="/logo.png" class="logo" alt="Marple"/>',`
    ${n}
    <div class="pdf-header keep-together">
      ${p}
      <div class="office-info">
        <div class="office-name">${k(d)}</div>
        <div class="office-sub">OAB/${k(e)} n\xba ${k(g)}</div>
        ${h?`<div class="office-mail">${k(h)}</div>`:""}
        ${i?`<div class="office-mail">${k(i)}</div>`:""}
      </div>
    </div>
  `}
      <div class="pdf-body">${s}</div>
      <div class="pdf-footer">
        <span>${k(t)}</span>
        <span>Gerado via Marple</span>
      </div>
    </div>
  `}a.s(["A4_WIDTH_PX",0,794,"MARGEM_PETICAO_PT",0,{left:3*b,top:3*b,right:2*b,bottom:2*b},"corrigirLocalNoTexto",0,f,"formatarLocalData",0,e,"limparMarkdownResidual",0,l,"marcarBlocoFinal",0,m,"margensDocxTwips",0,function(){return{top:Math.round(1701),right:Math.round(1134),bottom:Math.round(1134),left:Math.round(1701)}},"montarHtmlPeticao",0,p,"normalizarEstiloPeticao",0,c,"prepararTextoPeticao",0,function(a,b){return j(f(a,b))},"resolverLocalAdvogado",0,d],193963);let q="salario-maternidade-rural";function r(a){return String(a||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function s(a,b="A informar"){let c=String(a||"").trim();if(!c)return b;if(!/\d/.test(c))return c;let d=a=>a>=1900&&a<=Math.min(2100,new Date().getFullYear()+1),e=(a,b,c)=>!d(c)||b<1||b>12||a<1||a>31?null:`${String(a).padStart(2,"0")}/${String(b).padStart(2,"0")}/${c}`,f=c.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);if(f){var g;let a;return e(Number.parseInt(f[1],10),Number.parseInt(f[2],10),(a=Number.parseInt(g=f[3],10),2===g.length?a>=50?1900+a:2e3+a:a))||b}if(f=c.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))return e(Number.parseInt(f[3],10),Number.parseInt(f[2],10),Number.parseInt(f[1],10))||b;if(f=c.match(/^(\d{4})$/)){let a=Number.parseInt(f[1],10);return d(a)?String(a):b}let h=/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/g;if(h.test(c))return c.replace(h,a=>s(a,b));let i=/(\d{4})-(\d{2})-(\d{2})/g;return i.test(c)?c.replace(i,a=>s(a,b)):c}function t(a,b,c){let d=a.indexOf(b);if(-1===d)return"";let e=a.indexOf(c,d+b.length);return -1===e?a.slice(d+b.length).trim():a.slice(d+b.length,e).trim()}function u(a){return String(a||"").replace(/\u00a0/g," ").replace(/[ \t]+/g," ").replace(/\s+\n/g,"\n").replace(/\n\s+/g,"\n").trim()}function v(a,b=""){let c=b?`sm-para ${b}`:"sm-para";return a.split(/\n\s*\n/).map(a=>a.trim()).filter(Boolean).map(a=>{let b=r(u(l(a)).replace(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/g,a=>s(a)).replace(/(\d{4})-(\d{2})-(\d{2})/g,a=>s(a))).replace(/\n/g,"<br/>");return`<p class="${c}">${b}</p>`}).join("")}function w(a){let b,c,d,e,f;if(!a)return"";let g=a.estilo||"horizontal";if("none"===g||!a.eventos?.length)return"";if("vertical"===g){let b,c;return b=`LINHA DO TEMPO — ${a.nome.toUpperCase()} | ${a.atividade}${a.local?` • ${a.local}`:""}`,c=(a.eventos.length?a.eventos:[{data:"—",titulo:"Sem eventos",detalhe:""}]).map((a,b)=>`
      <tr>
        <td class="sm-tl-num">${b+1}</td>
        <td class="sm-tl-data">${r(a.data)}</td>
        <td class="sm-tl-body">
          <div class="sm-tl-titulo">${r(a.titulo)}</div>
          ${a.detalhe?`<div class="sm-tl-detalhe">${r(a.detalhe)}</div>`:""}
        </td>
      </tr>`).join(""),`
    <div class="sm-timeline sm-timeline-vertical keep-together">
      <div class="sm-tl-title">${r(b)}</div>
      <table class="sm-tl-table" cellpadding="0" cellspacing="0">
        <tbody>${c}</tbody>
      </table>
    </div>
  `}return d=(c=(b=a.eventos.length?a.eventos:[{data:"—",titulo:"Sem eventos",detalhe:""}]).length)>1?624/(c-1):0,e=`LINHA DO TEMPO — ${a.nome.toUpperCase()} | ${a.atividade}${a.local?` • ${a.local}`:""}`,f="",b.forEach((a,b)=>{let c=48+b*d,e=b%2==0;f+=`
      <circle cx="${c}" cy="130" r="14" fill="#0A2540" stroke="#D4AF37" stroke-width="2"/>
      <text x="${c}" y="135" text-anchor="middle" fill="#fff" font-size="11" font-family="Arial,sans-serif" font-weight="700">${b+1}</text>
      <text x="${c}" y="${e?60:204}" text-anchor="middle" fill="#555" font-size="10" font-family="Arial,sans-serif">${r(a.data)}</text>
      <text x="${c}" y="${e?78:168}" text-anchor="middle" fill="#0A2540" font-size="11" font-family="Arial,sans-serif" font-weight="700">${r(a.titulo)}</text>
      ${a.detalhe?`<text x="${c}" y="${e?96:186}" text-anchor="middle" fill="#666" font-size="9" font-family="Arial,sans-serif">${r(a.detalhe)}</text>`:""}
    `}),`
    <div class="sm-timeline keep-together">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 260" width="100%" height="260" role="img" aria-label="${r(e)}">
        <rect x="0" y="0" width="720" height="260" rx="12" ry="12" fill="#EEF1F5" stroke="#D0D7E2"/>
        <text x="16" y="28" fill="#0A2540" font-size="12" font-family="Arial,sans-serif" font-weight="700">${r(e)}</text>
        <line x1="48" y1="130" x2="672" y2="130" stroke="#0A2540" stroke-width="2.5"/>
        ${f}
      </svg>
    </div>
  `}function x(a,b=!0){if(!a.length)return"";let c=a.map(a=>{let b=a.match(/^((?:viii|vii|vi|iv|ix|iii|ii|v|i|x)+)\.\s*([\s\S]*)$/i),c=b?b[1].toLowerCase():"",d=b?b[2]:a;return`
        <table class="sm-pedido-item" data-pdf-keep="1" cellpadding="0" cellspacing="0" width="100%" border="0"
          style="width:100%;border-collapse:collapse;margin:0 0 10px;page-break-inside:avoid;break-inside:avoid;">
          <tr>
            <td style="font-size:11.5px;line-height:1.6;text-align:justify;padding:0;vertical-align:top;">
              <span class="sm-rom">${r(c)}.</span> ${r(l(d))}
            </td>
          </tr>
        </table>`}).join("");return`
    <div class="sm-pedidos">
      ${b?'<p class="sm-para sm-pedidos-intro">Diante do exposto, requer:</p>':""}
      ${c}
    </div>
  `}function y(a){return`<div class="sm-section-bar keep-together">${r(a)}</div>`}function z(a){return a.includes("<<<SM_RURAL_V2>>>")}function A(a){var b,c,d,g,h,i,j;let k,m,n,o,p,q,A,B,C,D,E,F=f(a.text,a.adv);if(!z(F))return null;let G=(b=t(F,"<<<META>>>","<<<END_META>>>"),{tipoAcao:b.match(/tipo_acao:\s*(.+)/i)?.[1]?.trim()||"SALÁRIO MATERNIDADE - SEGURADO ESPECIAL",juizoDigital:!/juizo_digital:\s*false/i.test(b),prioridades:{idoso:/prioridade_idoso:\s*true/i.test(b),deficiente:/prioridade_deficiente:\s*true/i.test(b),menor:/prioridade_menor:\s*true/i.test(b)}}),H=t(F,"<<<ENDERECO>>>","<<<END_ENDERECO>>>"),I=t(F,"<<<QUALIFICACAO>>>","<<<END_QUALIFICACAO>>>"),J=t(F,"<<<TITULO>>>","<<<SUBTITULO>>>"),K=t(F,"<<<SUBTITULO>>>","<<<END_TITULO>>>"),L=t(F,"<<<EM_FACE>>>","<<<END_EM_FACE>>>"),M=t(F,"<<<I_PRELIMINARES>>>","<<<END_I>>>"),N=function(a){let b=[];for(let c of a.split("\n")){let a=c.match(/^\|(.+)\|(.+)\|\s*$/);if(!a)continue;let d=l(a[1].trim()),e=l(a[2].trim());!d||/^[-:]+$/.test(d)||/^campo$/i.test(d)||/^valor$/i.test(e)||((/data|nascimento|requer|indefer|der\.?\s*adm|req\.?\s*adm/i.test(d)||/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(e)||/^\d{4}-\d{2}-\d{2}/.test(e))&&(e=s(e)),b.push({campo:d,valor:e}))}return b}(t(F,"<<<II_QUADRO>>>","<<<END_II>>>")),O=t(F,"<<<III_SINTESE_ANTES>>>","<<<END_III_ANTES>>>"),P=function(a){try{let b=JSON.parse(a);if(!b||!Array.isArray(b.eventos))return null;let c=String(b.estilo||"horizontal").toLowerCase();return{nome:String(b.nome||"AUTORA"),atividade:String(b.atividade||"Agricultora"),local:String(b.local||""),estilo:"vertical"===c||"none"===c?c:"horizontal",eventos:b.eventos.map(a=>{let b=String(a?.data||"").trim();return{data:b?/\d/.test(b)?s(b):b:"—",titulo:String(a?.titulo||""),detalhe:String(a?.detalhe||"")}})}}catch{return null}}(t(F,"<<<TIMELINE>>>","<<<END_TIMELINE>>>")),Q=t(F,"<<<III_SINTESE_DEPOIS>>>","<<<END_III_DEPOIS>>>"),R=t(F,"<<<IV_PROVAS>>>","<<<END_IV>>>").split("\n").map(a=>a.replace(/^✓\s*/,"").replace(/^[-*]\s*/,"").trim()).filter(Boolean).filter(a=>!a.startsWith("<")&&!/^#{1,6}\s/.test(a)),S=t(F,"<<<IV_FECHO>>>","<<<END_IV_FECHO>>>"),T=t(F,"<<<V_FUNDAMENTACAO>>>","<<<END_V>>>"),U=function(a){let b,c=[],d=/(?:^|\n)\s*((?:viii|vii|vi|iv|ix|iii|ii|v|i|x)+)\.\s+/gi,e=[];for(;null!==(b=d.exec(a));)e.push({num:b[1].toLowerCase(),start:b.index,bodyStart:b.index+b[0].length});for(let b=0;b<e.length;b++){let d=b+1<e.length?e[b+1].start:a.length,f=a.slice(e[b].bodyStart,d).trim();f&&c.push(`${e[b].num}. ${f}`)}return c}(t(F,"<<<VI_PEDIDOS>>>","<<<END_VI>>>")),V=t(F,"<<<FECHAMENTO>>>","<<<END_FECHAMENTO>>>"),W=(t(F,"<<<PLANILHA>>>","<<<END_PLANILHA>>>"),U.filter(a=>!/^viii\./i.test(a.trim()))),X=U.filter(a=>/^viii\./i.test(a.trim())),Y=M.match(/DA GRATUIDADE[\s\S]*/i)?.[0]||M,Z=Y.match(/^(DA GRATUIDADE[^:\n]*:?)/im),$=Z?.[1]||"DA GRATUIDADE DA JUSTIÇA:",_=Y.replace(/^(DA GRATUIDADE[^:\n]*:?)\s*/im,""),aa=function(a,b){let c=e(a),d=b.match(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s.]+\nOAB\/.+$/gm),f=(a,b)=>`
    <td class="sm-sign-card">
      <div class="sm-sign-line"></div>
      <div class="sm-sign-name">${r(a)}</div>
      <div class="sm-sign-oab">${r(b)}</div>
    </td>`,g="";if(d&&d.length)g=d.slice(0,2).map(a=>{let[b,c]=a.split("\n");return f(b.trim(),c.trim())}).join("");else{let b=String(a.name||"Advogado(a)"),c=String(a.oab_uf||a.estado||"").toUpperCase(),d=String(a.oab_number||"");g=f(b,`OAB/${c} n\xba ${d}`)}let h=b.replace(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s.]+\nOAB\/.+$/gm,"").replace(/^[A-Za-zÀ-ÿ ].*\/[A-Z]{2},?\s+\d{1,2}\s+de\s+\w+.*/gim,"").trim();return`
    <div class="sm-fechamento">
      ${v(h)}
      <p class="sm-local-data">${r(c)}.</p>
      <table class="sm-sign-row" cellpadding="0" cellspacing="0" width="100%">
        <tr>${g}</tr>
      </table>
    </div>
  `}(a.adv,V),ab=u(l(H||"AO JUÍZO FEDERAL DA VARA DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DA COMARCA DE [CIDADE]/[UF]")),ac=w(P),ad=!!ac.trim(),ae=l(J||"AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO-MATERNIDADE"),af=r((ae=ae.replace(/\s*SALÁRIO-MATERNIDADE\s*/gi," SALÁRIO-MATERNIDADE ")).trim()).replace(/SALÁRIO-MATERNIDADE/gi,"SALÁRIO-<br/>MATERNIDADE").replace(/SALÁRIO-\s*<br\/>\s*MATERNIDADE/gi,"SALÁRIO-<br/>MATERNIDADE"),ag=O||"";ad||(ag=ag.replace(/\s*A seguir,?\s+a linha do tempo[^\n.]*[.:]?\s*/gi," ").replace(/\s{2,}/g," ").trim());let ah=`
    ${(k=String((c=a.adv).office_name||c.name||"Advocacia"),m=String(c.oab_uf||c.estado||"").toUpperCase(),n=String(c.oab_number||""),o=String(c.email||""),q=(p=c.logo_url?String(c.logo_url):"")&&p.startsWith("data:")?`<img src="${p}" class="sm-logo" width="110" height="36" alt="Logo" style="height:36px;max-width:110px;width:auto;display:block;border:0;"/>`:p?`<img src="${r(p)}" class="sm-logo" width="110" height="36" alt="Logo" style="height:36px;max-width:110px;width:auto;display:block;border:0;"/>`:`<table cellpadding="0" cellspacing="0" style="width:36px;height:36px;background:#D4AF37;"><tr><td style="width:36px;height:36px;text-align:center;vertical-align:middle;font-weight:bold;font-size:11px;color:#000;">${r(k.slice(0,2).toUpperCase())}</td></tr></table>`,A=o?`<br/><span style="font-size:9px;color:#1d4ed8;line-height:1.4;">${r(o)}</span>`:"",`
    <div class="sm-header">
      <table class="sm-header-table" cellpadding="0" cellspacing="0" width="100%" border="0" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;">
        <colgroup>
          <col style="width:130px;" />
          <col style="width:auto;" />
        </colgroup>
        <tr>
          <td width="130" valign="middle" align="left" style="width:130px;vertical-align:middle;text-align:left;padding:0;overflow:hidden;">${q}</td>
          <td valign="middle" align="right" style="vertical-align:middle;text-align:right;padding:0 0 0 10px;overflow:hidden;">
            <p align="right" style="margin:0;padding:0;text-align:right;font-family:'Times New Roman',Times,serif;">
              <span style="font-weight:bold;font-size:11.5px;text-transform:uppercase;line-height:1.35;color:#0A2540;">${r(k)}</span><br/>
              <span style="font-size:9px;color:#444;line-height:1.4;">OAB/${r(m)} n\xb0 ${r(n)}</span>${A}
            </p>
          </td>
        </tr>
      </table>
      <div class="sm-header-line"></div>
    </div>
  `)}
    <div class="sm-endereco">${r(ab)}</div>
    ${(d=G.tipoAcao,g=G.juizoDigital,h=G.prioridades,B=a=>a?"(X)":"( )",C=(d||"").trim()||"SALÁRIO MATERNIDADE - SEGURADO ESPECIAL",`
    <table class="sm-meta-row" cellpadding="0" cellspacing="0">
      <tr>
        <td class="sm-meta-spacer">&nbsp;</td>
        <td class="sm-meta-cell">
          <table class="sm-meta-box" cellpadding="0" cellspacing="0">
            <tr><td class="sm-meta-inner">
              <div class="sm-meta-tipo">${r(C)}</div>
              ${!1!==g?'<div class="sm-meta-digital">JUÍZO 100% DIGITAL</div>':""}
              <div class="sm-meta-prio">
                <div class="sm-meta-prio-title">Prioridade Legal na tramita\xe7\xe3o processual:</div>
                <div class="sm-meta-prio-item">${B(h.idoso)} Idoso(a) maior de 60 anos – Lei 10.741/2003;</div>
                <div class="sm-meta-prio-item">${B(h.deficiente)} Deficiente – Lei 12.008/2009 – Laudo em anexo;</div>
                <div class="sm-meta-prio-item">${B(h.menor)} Menor nos termos do ECA – Lei 8.069/1990;</div>
              </div>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  `)}
    ${v(I,"sm-para-qualif")}
    <div class="sm-main-title">${af}</div>
    <div class="sm-sub-title">${r(l(K||"(SEGURADA ESPECIAL – AGRICULTORA)"))}</div>
    ${v(L)}
    ${y("I – PRELIMINARMENTE")}
    ${(i=l($),`<div class="sm-subhead keep-together">${r(i)}</div>`)}
    ${v(_)}
    ${y("II – QUADRO SINÓPTICO")}
    ${(D=N.map((a,b)=>`
      <tr class="${b%2==0?"even":"odd"}">
        <td class="campo">${r(a.campo)}</td>
        <td class="valor">${r(a.valor)}</td>
      </tr>`).join(""),`
    <div class="sm-table-wrap keep-together">
      <div class="sm-table-caption">RESUMO DAS PRINCIPAIS INFORMA\xc7\xd5ES DO PROCESSO</div>
      <table class="sm-quadro">
        <tbody>${D}</tbody>
      </table>
    </div>
  `)}
    ${y("III – SÍNTESE DO CONTEXTO FÁTICO")}
    ${v(ag)}
    ${ad?ac:""}
    ${v(Q||"")}
    ${y("IV – DAS PROVAS JUNTADAS AOS AUTOS")}
    
    <div class="sm-provas keep-together">
      <table class="sm-provas-table" cellpadding="0" cellspacing="0" width="100%">
        ${R.map((a,b)=>`
          <tr class="${b%2==0?"even":"odd"}">
            <td class="sm-check">✓</td>
            <td class="sm-prova-txt">${r(a)}</td>
          </tr>`).join("")}
      </table>
    </div>
  
    ${v(S)}
    ${y("V – FUNDAMENTAÇÃO JURÍDICA")}
    ${v(T)}
    ${y("VI – PEDIDO / REQUERIMENTOS")}
    ${x(W.length?W:U,!0)}
    ${X.length?x(X,!1):""}
    <div class="sm-fecho-bloco">
      ${aa}
      
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
    ${(E=new Date().toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"}),`
    <div class="sm-doc-fecho-wrap">
      <div class="sm-doc-gerado">Documento gerado em ${r(E)} pela plataforma Marple</div>
    </div>
  `)}
  `;return`
    <style>${j=!1!==a.comMargens,`
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
      ${j?"padding: 3cm 2cm 2cm 3cm;":"padding: 0; box-sizing: border-box;"}
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
      ${ah}
    </div>
  `}a.s(["AGENT_SM_RURAL",0,q,"injetarTimelineNoTexto",0,function(a,b){let c=JSON.stringify({nome:b.nome,atividade:b.atividade,local:b.local,estilo:b.estilo||"horizontal",eventos:b.eventos},null,2),d=`<<<TIMELINE>>>
${c}
<<<END_TIMELINE>>>`;return/<<<TIMELINE>>>[\s\S]*?<<<END_TIMELINE>>>/.test(a)?a.replace(/<<<TIMELINE>>>[\s\S]*?<<<END_TIMELINE>>>/,d):a.includes("<<<III_SINTESE_DEPOIS>>>")?a.replace("<<<III_SINTESE_DEPOIS>>>",`${d}

<<<III_SINTESE_DEPOIS>>>`):`${a.trim()}

${d}
`},"isSmRuralStructured",0,z,"montarHtmlSmRural",0,A,"montarTimelineDataPadrao",0,function(a,b="horizontal"){let c,d,e=[(a.cidade||"").trim(),(a.estado||a.uf||"").trim()].filter(Boolean).join("/");if(!e&&(a.endereco||"").trim()){let b=a.endereco.match(/([A-Za-zÀ-ú\s]+)\s*\/\s*([A-Z]{2})\s*$/);b&&(e=`${b[1].trim()}/${b[2]}`)}return{nome:(a.nome||"AUTORA").trim()||"AUTORA",atividade:(a.atividade||a.ocupacao||"Agricultora").trim()||"Agricultora",local:e,estilo:b,eventos:(c=[],(d=(a.periodo_segurado||"").trim())&&c.push({data:"Infância / juventude",titulo:"Início do labor rural",detalhe:d}),(a.data_nascimento_crianca||"").trim()&&c.push({data:s(a.data_nascimento_crianca.trim()),titulo:"Nascimento do(a) filho(a)",detalhe:a.nome_crianca?`Crian\xe7a: ${a.nome_crianca}`:""}),(a.data_requerimento||"").trim()&&c.push({data:s(a.data_requerimento.trim()),titulo:"Requerimento administrativo",detalhe:a.nb?`NB ${a.nb}`:"Pedido de salário-maternidade"}),(a.data_indeferimento||"").trim()&&c.push({data:s(a.data_indeferimento.trim()),titulo:"Indeferimento pelo INSS",detalhe:(a.motivo_inss||"").trim().slice(0,80)}),c.push({data:new Date().toLocaleDateString("pt-BR"),titulo:"Ajuizamento da ação",detalhe:"Petição inicial — JEF"}),c.length?c:[{data:"—",titulo:"Evento 1",detalhe:""},{data:"—",titulo:"Evento 2",detalhe:""}])}},"renderTimelineHtml",0,w,"slugArquivoPeticaoSm",0,function(a){let b=String(a||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").replace(/-{2,}/g,"-");return`peticao-salario-maternidade-${b||"cliente"}`},"textoRodapeSm",0,function(a){let b=String(a.office_name||a.name||"Advocacia").trim(),{localFormatado:c}=d(a),e=b.toUpperCase();return c?`${e} | ${c}`:e}],358275),a.s(["montarHtmlPeticao",0,function(a){if(a.agentType===q||z(a.text)){let b=A({text:a.text,adv:a.adv,comMargens:a.comMargens,estilo:a.estilo});if(b)return b}return p(a)}],261461)}];

//# sourceMappingURL=preveia_lib_montar-html-peticao_ts_16r9cif._.js.map