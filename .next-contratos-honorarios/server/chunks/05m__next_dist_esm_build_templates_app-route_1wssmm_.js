module.exports=[1334,e=>{"use strict";var a=e.i(76245),t=e.i(69629),o=e.i(85852),r=e.i(95369),i=e.i(94131),n=e.i(38008),s=e.i(17185),d=e.i(40564),l=e.i(74714),c=e.i(17608),u=e.i(36036),m=e.i(13489),p=e.i(85503),x=e.i(36142),E=e.i(71289),A=e.i(93695);e.i(37708);var f=e.i(57162),R=e.i(54567),I=e.i(47152);function N(e){let a=String(e?.cidade||e?.city||"").trim(),t=String(e?.estado||e?.state||e?.oab_uf||"").trim().toUpperCase();return a&&t?{cidade:a,uf:t,localFormatado:`${a}/${t}`}:a?{cidade:a,uf:t,localFormatado:a}:t?{cidade:"",uf:t,localFormatado:t}:{cidade:"",uf:"",localFormatado:""}}let _=`

CITA\xc7\xc3O DE FONTES:
- N\xc3O acrescente se\xe7\xe3o "Fontes e Refer\xeancias", lista de links, URLs ou bibliografia ao final da pe\xe7a.
- Cite a legisla\xe7\xe3o e a jurisprud\xeancia de forma inline na fundamenta\xe7\xe3o, no padr\xe3o forense:
  "art. 71 da Lei n\xba 8.213/1991", "art. 7\xba, XVIII, da CF/88", "S\xfamula n\xba 41 da TNU",
  "STF, ADI 2.110/DF, Rel. Min. ..., j. 28/03/2024", "STJ, REsp n\xba 1.354.908/SP, Tema 692".
- Cite apenas normas e precedentes reais e pertinentes; nunca invente n\xfamero de lei, s\xfamula, tema ou ac\xf3rd\xe3o.`,v=`

HIERARQUIA DE T\xcdTULOS (obrigat\xf3ria — use markdown leve s\xf3 nos t\xedtulos):
- Se\xe7\xe3o principal: ## I — PRELIMINARMENTE
- Subitem: ### 1.1 Da Gratuidade da Justi\xe7a
- Sub-subitem (se necess\xe1rio): #### 1.1.1 ...
- NUNCA repita o t\xedtulo da se\xe7\xe3o pai como se fosse tamb\xe9m um subitem.
  ERRADO:
    ## 1. PRELIMINARMENTE
    ### 1. PRELIMINARMENTE
    ### 1.1 Da Gratuidade
  ERRADO:
    ## I — PRELIMINARMENTE
    I — PRELIMINARMENTE
    ### 1.1 Da Gratuidade
  CORRETO:
    ## I — PRELIMINARMENTE
    ### 1.1 Da Gratuidade da Justi\xe7a
    (texto do subitem)
    ### 1.2 Da Tutela de Urg\xeancia
    (texto do subitem)
- N\xe3o funda se\xe7\xe3o e subitem no mesmo t\xedtulo (evite "PRELIMINARMENTE / DA GRATUIDADE" como \xfanico ##).

FECHAMENTO (nesta ordem, sem t\xedtulos extras):
Nestes termos,
Pede deferimento.

[Cidade]/[UF], [data por extenso].

[Nome do advogado]
OAB/[UF] n\xba [n\xfamero]`,h=`
Voc\xea \xe9 um advogado previdenciarista especializado com 20 anos de experi\xeancia.
Gere uma PETI\xc7\xc3O INICIAL COMPLETA para Sal\xe1rio-Maternidade — Segurada Especial no JEF.

FORMATO OBRIGAT\xd3RIO (PRIORIDADE M\xc1XIMA — sobrescreve as regras gen\xe9ricas de hierarquia/fechamento abaixo):
A sa\xedda DEVE come\xe7ar com <<<SM_RURAL_V2>>> e usar EXATAMENTE os marcadores abaixo, nesta ordem.
N\xc3O use markdown ## / ### fora desses blocos. N\xc3O invente se\xe7\xf5es extras.
O sistema renderiza o PDF no layout Cust\xf3dio Advogados (6 p\xe1ginas) a partir desses marcadores.

<<<SM_RURAL_V2>>>
<<<META>>>
tipo_acao: SAL\xc1RIO MATERNIDADE - SEGURADO ESPECIAL
juizo_digital: true
prioridade_idoso: false
prioridade_deficiente: false
prioridade_menor: false
<<<END_META>>>

<<<ENDERECO>>>
AO JU\xcdZO FEDERAL DA VARA DO JUIZADO ESPECIAL FEDERAL DA SUBSE\xc7\xc3O JUDICI\xc1RIA DA COMARCA DE [Cidade]/[UF]
<<<END_ENDERECO>>>

<<<QUALIFICACAO>>>
[Par\xe1grafo corrido completo com nome, profiss\xe3o, data de nascimento, idade, RG, CPF, endere\xe7o, men\xe7\xe3o aos procuradores e fundamento legal, TERMINANDO exatamente com as palavras: propor a presente]
<<<END_QUALIFICACAO>>>

<<<TITULO>>>
A\xc7\xc3O PREVIDENCI\xc1RIA DE CONCESS\xc3O DE SAL\xc1RIO-MATERNIDADE
<<<SUBTITULO>>>
(SEGURADA ESPECIAL – AGRICULTORA)
<<<END_TITULO>>>

<<<EM_FACE>>>
[Par\xe1grafo "Em face do INSTITUTO NACIONAL DO SEGURO SOCIAL – INSS..." com endere\xe7o de cita\xe7\xe3o na comarca]
<<<END_EM_FACE>>>

<<<I_PRELIMINARES>>>
DA GRATUIDADE DA JUSTI\xc7A:
[Par\xe1grafo da gratuidade — art. 5\xba, LXXIV, CF/88 e Lei 1.060/50]
<<<END_I>>>

<<<II_QUADRO>>>
| Campo | Valor |
| --- | --- |
| Nome | [nome] |
| Idade no Req. Adm. | [idade] |
| Pedido | Sal\xe1rio-Maternidade – Segurado Especial |
| Crian\xe7a | [nome da crian\xe7a] |
| Data de Nascimento | [dd/mm/aaaa] |
| Data do Req. Adm. | [dd/mm/aaaa] |
| NB | [n\xfamero] |
| Situa\xe7\xe3o/Decis\xe3o INSS | [Indeferido/etc.] |
| Data do Indef. Adm. | [dd/mm/aaaa] |
| Motivo INSS | [motivo] |
| Tempo de trabalho antes do parto | [texto] |
| Per\xedodo de Segurado Especial declarado | [texto] |
| Ponto controvertido | [texto] |
| Benef\xedcio anterior | [texto ou N\xe3o consta] |
| Per\xedodo averbado no CNIS | [texto ou N\xe3o consta] |
| V\xednculo urbano | [texto] |
<<<END_II>>>

<<<III_SINTESE_ANTES>>>
[2–3 par\xe1grafos narrativos sobre a autora, atividade rural e economia familiar]
[\xdaltimo par\xe1grafo deve terminar com: A seguir, a linha do tempo de sua trajet\xf3ria de vida e trabalho rural:]
<<<END_III_ANTES>>>

<<<TIMELINE>>>
{"nome":"[NOME DA AUTORA]","atividade":"Agricultora","local":"[Cidade]/[UF]","eventos":[{"data":"AAAA ou dd/mm/aaaa","titulo":"Evento curto","detalhe":"detalhe opcional"},{"data":"...","titulo":"...","detalhe":"..."},{"data":"...","titulo":"...","detalhe":"..."},{"data":"...","titulo":"...","detalhe":"..."},{"data":"...","titulo":"...","detalhe":"..."}]}
<<<END_TIMELINE>>>

<<<III_SINTESE_DEPOIS>>>
[Par\xe1grafos ap\xf3s a timeline: nascimento do filho, per\xedodo gestacional, requerimento administrativo, indeferimento e cr\xedtica \xe0 decis\xe3o]
<<<END_III_DEPOIS>>>

<<<IV_PROVAS>>>
✓ [prova 1]
✓ [prova 2]
✓ [prova 3]
✓ [prova 4]
✓ [prova 5]
<<<END_IV>>>

<<<IV_FECHO>>>
[Par\xe1grafo de fechamento da se\xe7\xe3o de provas — in\xedcio de prova material + economia familiar + car\xeancia]
<<<END_IV_FECHO>>>

<<<V_FUNDAMENTACAO>>>
[4–6 par\xe1grafos: art. 71 e art. 39 p.u. Lei 8.213/91; STF ADIs 2110 e 2111 (28/03/2024); CF/88 art. 7\xba, XVIII; STJ/TRFs; TNU; conclus\xe3o]
<<<END_V>>>

<<<VI_PEDIDOS>>>
i. [comunica\xe7\xf5es em nome dos advogados — art. 272, \xa75\xba, CPC]
ii. [proced\xeancia e concess\xe3o do sal\xe1rio-maternidade]
iii. [averba\xe7\xe3o no CNIS]
iv. [cita\xe7\xe3o da r\xe9 + juntada do PA NB]
v. [pagamento de 120 dias + corre\xe7\xe3o e juros]
vi. [audi\xeancia UNA]
vii. [justi\xe7a gratuita]
viii. [destaque de honor\xe1rios contratuais de [honor\xe1rios]% em favor do escrit\xf3rio]
<<<END_VI>>>

<<<FECHAMENTO>>>
Protesta o alegado por todos os meios admitidos em direito, especialmente o depoimento pessoal da parte autora e das testemunhas que comparecer\xe3o em audi\xeancia, independente de intima\xe7\xe3o.

D\xe1-se \xe0 causa o valor de R$ 6.072,00 (seis mil e setenta e dois reais), renunciando-se a eventual excedente da al\xe7ada do Juizado Especial Federal, especificamente para fins de fixa\xe7\xe3o da compet\xeancia.

Termos em que, pede e espera deferimento.

[Nome do Advogado em MAI\xdaSCULAS]
OAB/[UF] n\xba [n\xfamero]
<<<END_FECHAMENTO>>>

<<<PLANILHA>>>
| Campo | Valor |
| --- | --- |
| 1\xba M\xeas de benef\xedcio | R$ 1.518,00 |
| 2\xba M\xeas de benef\xedcio | R$ 1.518,00 |
| 3\xba M\xeas de benef\xedcio | R$ 1.518,00 |
| 4\xba M\xeas de benef\xedcio | R$ 1.518,00 |
| TOTAL | R$ 6.072,00 |
nota: Refer\xeancia do valor: quantia devida por fato gerador (cada nascimento)
<<<END_PLANILHA>>>

REGRAS:
- Tom formal, humanizado e persuasivo
- Usar EXATAMENTE os dados fornecidos pelo usu\xe1rio
- Sempre citar STF ADIs 2110 e 2111, j. 28/03/2024
- Na TIMELINE: 4 a 7 eventos reais do caso (nascimento, labor rural, requerimento, indeferimento etc.)
- prioridade_menor: true se a autora for menor de 18 anos
- Local/data da assinatura: o sistema completa com a cidade do escrit\xf3rio — no FECHAMENTO N\xc3O escreva a linha de cidade/data
- Valor da causa padr\xe3o: R$ 6.072,00 (4 \xd7 sal\xe1rio m\xednimo R$ 1.518,00), salvo outro valor informado
`;var C=e.i(30163),g=e.i(75987);let D=(0,I.createClient)("https://vqngqzfzrtfifbqltwai.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY);async function O(e){let a,t,o,r,i,{agentType:n,formData:s,clientId:d,clientName:l}=await e.json(),c=(e.headers.get("Authorization")||"").replace("Bearer ",""),u=e.headers.get("x-forwarded-for")||"unknown";if(!(0,g.rateLimit)(u,20,6e4))return Response.json({error:"Muitas requisições. Tente novamente em 1 minuto."},{status:429});let m=(0,I.createClient)("https://vqngqzfzrtfifbqltwai.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY),{data:{user:p},error:x}=await m.auth.getUser(c);if(x||!p)return Response.json({error:"unauthorized"},{status:401});let{data:E}=await m.from("lawyers").select("*").eq("id",p.id).single();if(E&&"cargo"in E&&!(0,C.temAcessoTotal)(E.cargo))return Response.json({error:"cargo_sem_permissao"},{status:403});let A=new Date(E.trial_expires_at)>new Date,f=E.docs_trial_used<5,O="trial"!==E.plan;if(!(A&&f||O))return Response.json({error:"trial_expired"},{status:403});let{data:T}=d?await m.from("clients").select("*").eq("id",d).eq("lawyer_id",p.id).single():{data:null},S=(l||s?.nome||"").trim();if(!d&&!S)return Response.json({error:"Informe um cliente cadastrado ou o nome manual do cliente."},{status:400});if(d&&!T)return Response.json({error:"Cliente não encontrado."},{status:400});let b=T?.id||null,w=T?.name||S,P=(a=N(E),t=function(e,a=new Date){let{localFormatado:t}=N(e),o=function(e=new Date){return e.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"})}(a);return t?`${t}, ${o}`:o}(E),o=a.cidade?`use exatamente "${a.localFormatado}" (nunca omita a cidade; nunca escreva s\xf3 "/${a.uf}" ou s\xf3 "${a.uf}")`:a.uf?`a cidade do escrit\xf3rio n\xe3o est\xe1 cadastrada — use apenas "${a.uf}" (ex.: "${a.uf}, 16 de julho de 2025"), NUNCA escreva "/${a.uf}" nem "undefined/${a.uf}"`:"use [Cidade]/[UF] apenas se os dados forem conhecidos; não invente cidade",i=({"salario-maternidade-rural":(r=`
DADOS DO ADVOGADO (use obrigatoriamente no cabe\xe7alho e pedidos):
  Nome: ${E?.name||""}
  OAB: ${E?.oab_number||""}/${E?.oab_uf||""}
  Email: ${E?.email||""}
  WhatsApp: ${E?.whatsapp||""}
  Cidade: ${a.cidade||"(não cadastrada)"}
  UF: ${a.uf||""}
  Local formatado: ${a.localFormatado||"(incompleto)"}
  Exemplo de linha de local/data: ${t}
  Vara: ${E?.vara_padrao||""}
  Honor\xe1rios: ${E?.honorarios_pct??""}%

LOCAL/DATA E COMARCA:
  - ${o}
  - Formato da linha de assinatura: "${a.localFormatado||"[Cidade]/[UF]"}, [data por extenso]."
  - Na comarca: "COMARCA DE ${a.localFormatado||"[Cidade]/[UF]"}"`)+h})[n]??r+"\nGere o documento solicitado de forma profissional e completa.","salario-maternidade-rural"===n?i+_:i+v+_),M=new R.default({apiKey:process.env.ANTHROPIC_API_KEY}),U=new TextEncoder,L="",F=new ReadableStream({async start(e){try{for await(let a of M.messages.stream({model:"claude-sonnet-4-6",max_tokens:6e3,system:P,messages:[{role:"user",content:JSON.stringify(s)}]}))"content_block_delta"===a.type&&"text_delta"===a.delta.type&&(L+=a.delta.text,e.enqueue(U.encode(a.delta.text)));let{data:a}=await m.from("documents").insert({lawyer_id:p.id,client_id:b,client_name:w,agent_type:n,title:s.nome?`Peti\xe7\xe3o — ${s.nome}`:n,content:L,form_data:s,status:"generated",lawyer_snapshot:{name:E.name,oab_number:E.oab_number,oab_uf:E.oab_uf,email:E.email,whatsapp:E.whatsapp,cidade:E.cidade,estado:E.estado||E.oab_uf,logo_url:E.logo_url,signature_url:E.signature_url,banner_url:E.banner_url,honorarios_pct:E.honorarios_pct,vara_padrao:E.vara_padrao,cor_peticao:E.cor_peticao,estilo_peticao:"classico"===E.estilo_peticao?"classico":"moderno"}}).select("id").single(),t={lawyer_id:p.id,title:"Nova petição gerada com sucesso!",type:"success"},{error:o}=await m.from("notifications").insert({...t,document_id:a?.id??null,status:"done",progress:100});o&&await m.from("notifications").insert(t),await D.from("audit_logs").insert({lawyer_id:p.id,action:"GERAR_PETICAO",resource:"documents",details:{tipo:s?.agente||"petição"}})}catch(a){e.enqueue(U.encode("[ERRO_GERACAO]"))}finally{e.close()}}});return new Response(F,{headers:{"Content-Type":"text/plain; charset=utf-8"}})}e.s(["POST",0,O,"runtime",0,"nodejs"],93734);var T=e.i(93734);let S=new a.AppRouteRouteModule({definition:{kind:t.RouteKind.APP_ROUTE,page:"/api/gerar-documento/route",pathname:"/api/gerar-documento",filename:"route",bundlePath:""},distDir:".next-contratos-honorarios",relativeProjectDir:"",resolvedPagePath:"[project]/preveia/app/api/gerar-documento/route.ts",nextConfigOutput:"",userland:T,...{}}),{workAsyncStorage:b,workUnitAsyncStorage:w,serverHooks:P}=S;async function M(e,a,o){o.requestMeta&&(0,r.setRequestMeta)(e,o.requestMeta),S.isDev&&(0,r.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let R="/api/gerar-documento/route";R=R.replace(/\/index$/,"")||"/";let I=await S.prepare(e,a,{srcPage:R,multiZoneDraftMode:!1});if(!I)return a.statusCode=400,a.end("Bad Request"),null==o.waitUntil||o.waitUntil.call(o,Promise.resolve()),null;let{buildId:N,deploymentId:_,params:v,nextConfig:h,parsedUrl:C,isDraftMode:g,prerenderManifest:D,routerServerContext:O,isOnDemandRevalidate:T,revalidateOnlyGenerated:b,resolvedPathname:w,clientReferenceManifest:P,serverActionsManifest:M}=I,U=(0,s.normalizeAppPath)(R),L=!!(D.dynamicRoutes[U]||D.routes[w]),F=async()=>((null==O?void 0:O.render404)?await O.render404(e,a,C,!1):a.end("This page could not be found"),null);if(L&&!g){let e=!!D.routes[w],a=D.dynamicRoutes[U];if(a&&!1===a.fallback&&!e){if(h.adapterPath)return await F();throw new A.NoFallbackError}}let y=null;!L||S.isDev||g||(y="/index"===(y=w)?"/":y);let $=!0===S.isDev||!L,q=L&&!$;M&&P&&(0,n.setManifestsSingleton)({page:R,clientReferenceManifest:P,serverActionsManifest:M});let V=e.method||"GET",H=(0,i.getTracer)(),j=H.getActiveScopeSpan(),G=!!(null==O?void 0:O.isWrappedByNextServer),k=!!(0,r.getRequestMeta)(e,"minimalMode"),B=(0,r.getRequestMeta)(e,"incrementalCache")||await S.getIncrementalCache(e,h,D,k);null==B||B.resetRequestCache(),globalThis.__incrementalCache=B;let z={params:v,previewProps:D.preview,renderOpts:{experimental:{authInterrupts:!!h.experimental.authInterrupts},cacheComponents:!!h.cacheComponents,supportsDynamicResponse:$,incrementalCache:B,cacheLifeProfiles:h.cacheLife,waitUntil:o.waitUntil,onClose:e=>{a.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(a,t,o,r)=>S.onRequestError(e,a,o,r,O)},sharedContext:{buildId:N,deploymentId:_}},K=new d.NodeNextRequest(e),J=new d.NodeNextResponse(a),X=l.NextRequestAdapter.fromNodeNextRequest(K,(0,l.signalFromNodeResponse)(a));try{let r,n=async e=>S.handle(X,z).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":a.statusCode,"next.rsc":!1});let t=H.getRootSpanAttributes();if(!t)return;if(t.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${t.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let o=t.get("next.route");if(o){let a=`${V} ${o}`;e.setAttributes({"next.route":o,"http.route":o,"next.span_name":a}),e.updateName(a),r&&r!==e&&(r.setAttribute("http.route",o),r.updateName(a))}else e.updateName(`${V} ${R}`)}),s=async r=>{var i,s;let d=async({previousCacheEntry:t})=>{try{if(!k&&T&&b&&!t)return a.statusCode=404,a.setHeader("x-nextjs-cache","REVALIDATED"),a.end("This page could not be found"),null;let i=await n(r);e.fetchMetrics=z.renderOpts.fetchMetrics;let s=z.renderOpts.pendingWaitUntil;s&&o.waitUntil&&(o.waitUntil(s),s=void 0);let d=z.renderOpts.collectedTags;if(!L)return await (0,m.sendResponse)(K,J,i,z.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),a=(0,p.toNodeOutgoingHttpHeaders)(i.headers);d&&(a[E.NEXT_CACHE_TAGS_HEADER]=d),!a["content-type"]&&e.type&&(a["content-type"]=e.type);let t=void 0!==z.renderOpts.collectedRevalidate&&!(z.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&z.renderOpts.collectedRevalidate,o=void 0===z.renderOpts.collectedExpire||z.renderOpts.collectedExpire>=E.INFINITE_CACHE?void 0:z.renderOpts.collectedExpire;return{value:{kind:f.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:a},cacheControl:{revalidate:t,expire:o}}}}catch(a){throw(null==t?void 0:t.isStale)&&await S.onRequestError(e,a,{routerKind:"App Router",routePath:R,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:T})},!1,O),a}},l=await S.handleResponse({req:e,nextConfig:h,cacheKey:y,routeKind:t.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:D,isRoutePPREnabled:!1,isOnDemandRevalidate:T,revalidateOnlyGenerated:b,responseGenerator:d,waitUntil:o.waitUntil,isMinimalMode:k});if(!L)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==f.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(s=l.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});k||a.setHeader("x-nextjs-cache",T?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),g&&a.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let c=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return k&&L||c.delete(E.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||a.getHeader("Cache-Control")||c.get("Cache-Control")||c.set("Cache-Control",(0,x.getCacheControlHeader)(l.cacheControl)),await (0,m.sendResponse)(K,J,new Response(l.value.body,{headers:c,status:l.value.status||200})),null};G&&j?await s(j):(r=H.getActiveScopeSpan(),await H.withPropagatedContext(e.headers,()=>H.trace(c.BaseServerSpan.handleRequest,{spanName:`${V} ${R}`,kind:i.SpanKind.SERVER,attributes:{"http.method":V,"http.target":e.url}},s),void 0,!G))}catch(a){if(a instanceof A.NoFallbackError||await S.onRequestError(e,a,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:T})},!1,O),L)throw a;return await (0,m.sendResponse)(K,J,new Response(null,{status:500})),null}}e.s(["handler",0,M,"patchFetch",0,function(){return(0,o.patchFetch)({workAsyncStorage:b,workUnitAsyncStorage:w})},"routeModule",0,S,"serverHooks",0,P,"workAsyncStorage",0,b,"workUnitAsyncStorage",0,w],1334)}];

//# sourceMappingURL=05m__next_dist_esm_build_templates_app-route_1wssmm_.js.map