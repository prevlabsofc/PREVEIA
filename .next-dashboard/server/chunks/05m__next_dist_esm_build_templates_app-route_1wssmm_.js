module.exports=[842655,e=>{"use strict";var a=e.i(876245),t=e.i(769629),o=e.i(85852),r=e.i(495369),i=e.i(694131),n=e.i(438008),s=e.i(617185),d=e.i(540564),l=e.i(74714),c=e.i(617608),u=e.i(336036),m=e.i(113489),p=e.i(85503),x=e.i(36142),E=e.i(471289),A=e.i(193695);e.i(537708);var R=e.i(357162),f=e.i(254567),I=e.i(347152);e.i(276308);var N=e.i(20021),_=e.i(405045);function O(e){let a=String(e?.cidade||e?.city||"").trim(),t=String(e?.estado||e?.state||e?.oab_uf||"").trim().toUpperCase();return(a||t&&"MA"!==t||(a="São Luís",t="MA"),a&&t)?{cidade:a,uf:t,localFormatado:`${a}/${t}`}:a?{cidade:a,uf:t,localFormatado:a}:t?{cidade:"",uf:t,localFormatado:`[Cidade]/${t}`}:{cidade:"São Luís",uf:"MA",localFormatado:"São Luís/MA"}}let C=`

CITA\xc7\xc3O DE FONTES:
- N\xc3O acrescente se\xe7\xe3o "Fontes e Refer\xeancias", lista de links, URLs ou bibliografia ao final da pe\xe7a.
- Cite a legisla\xe7\xe3o e a jurisprud\xeancia de forma inline na fundamenta\xe7\xe3o, no padr\xe3o forense:
  "art. 71 da Lei n\xba 8.213/1991", "art. 7\xba, XVIII, da CF/88", "S\xfamula n\xba 41 da TNU",
  "STF, ADI 2.110/DF, Rel. Min. ..., j. 28/03/2024", "STJ, REsp n\xba 1.354.908/SP, Tema 692".
- Cite apenas normas e precedentes reais e pertinentes; nunca invente n\xfamero de lei, s\xfamula, tema ou ac\xf3rd\xe3o.`,g=`

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
OAB/[UF] n\xba [n\xfamero]`,D=`
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
{"nome":"[NOME DA AUTORA]","atividade":"Agricultora","local":"[Cidade]/[UF]","estilo":"horizontal","eventos":[{"data":"AAAA ou dd/mm/aaaa","titulo":"Evento curto","detalhe":"detalhe opcional"},{"data":"...","titulo":"...","detalhe":"..."},{"data":"...","titulo":"...","detalhe":"..."},{"data":"...","titulo":"...","detalhe":"..."},{"data":"...","titulo":"...","detalhe":"..."}]}
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
- Na TIMELINE: 4 a 7 eventos reais do caso (nascimento, labor rural, requerimento, indeferimento etc.). O sistema pode sobrescrever este bloco com a configura\xe7\xe3o do usu\xe1rio (estilo: horizontal | vertical | none).
- prioridade_menor: true se a autora for menor de 18 anos
- Local/data da assinatura: o sistema completa com a cidade do escrit\xf3rio — no FECHAMENTO N\xc3O escreva a linha de cidade/data
- Valor da causa padr\xe3o: R$ 6.072,00 (4 \xd7 sal\xe1rio m\xednimo R$ 1.518,00), salvo outro valor informado
`;var T=e.i(630163),h=e.i(675987),v=e.i(84499);let S=(0,I.createClient)("https://vqngqzfzrtfifbqltwai.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY);function b(e){let a=new WeakSet;return JSON.stringify(e,(e,t)=>{if("bigint"==typeof t)return t.toString();if(t&&"object"==typeof t){if(a.has(t))return"[Circular]";a.add(t)}return t instanceof Error?{name:t.name,message:t.message,stack:t.stack}:t},2)}function M(e){return e instanceof Error?{name:e.name,message:e.message,stack:e.stack}:{message:"string"==typeof e?e:"Erro desconhecido",raw:e}}async function w(e){let a=null;try{let t,o,r,i,n,{agentType:s,formData:d,clientId:l,clientName:c}=(a=await e.json())??{};console.log("[GERAR_DOCUMENTO][BODY_RECEBIDO]",b({agentType:s,clientId:l,clientName:c,formData:d}));let u=d&&"object"==typeof d?d:{},m=l??null,p=c??null,x=e.headers.get("x-forwarded-for")||"unknown";if(!(0,h.rateLimit)(x,20,6e4))return Response.json({error:"Muitas requisições. Tente novamente em 1 minuto."},{status:429});let E=await (0,_.cookies)(),A=(0,N.createServerClient)("https://vqngqzfzrtfifbqltwai.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbmdxemZ6cnRmaWZicWx0d2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNTY4NDQsImV4cCI6MjA5NzczMjg0NH0.JMZVJ_NB4UpYMlq0MHkONi8Ed5VGMhF6jXTfWwAqzNk",{cookies:{getAll:()=>E.getAll(),setAll:()=>{}}}),R=null,{data:w}=await A.auth.getUser();if(w?.user)R=w.user;else{let a=(e.headers.get("Authorization")||"").replace("Bearer ","").trim();if(a){let e=(0,I.createClient)("https://vqngqzfzrtfifbqltwai.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY),{data:t}=await e.auth.getUser(a);R=t?.user??null}}if(!R)return Response.json({error:"unauthorized"},{status:401});let{data:U,error:P}=await S.from("lawyers").select("*").eq("id",R.id).single();if(P&&console.error("[GERAR_DOCUMENTO][ADV_ERROR]",P),!U)return console.error("[GERAR_DOCUMENTO][ADV_MISSING]",{lawyerId:R.id}),Response.json({error:"Usuário não está cadastrado como advogado no sistema."},{status:400});let{data:L}=m?await S.from("clients").select("*").eq("id",m).eq("lawyer_id",R.id).single():{data:null};if("cargo"in U&&!(0,T.temAcessoTotal)(U.cargo))return Response.json({error:"cargo_sem_permissao"},{status:403});let F=new Date(U.trial_expires_at)>new Date,y=U.docs_trial_used<5,q="trial"!==U.plan;if(!(F&&y||q))return Response.json({error:"trial_expired"},{status:403});let $=(p||u?.nome||"").trim();if(!m&&!$)return console.warn("[GERAR_DOCUMENTO][VALIDACAO_CLIENTE_FALTANTE]",{normalizedClientId:m,normalizedClientName:p,formDataNome:u?.nome}),Response.json({error:"Informe um cliente cadastrado ou o nome manual do cliente."},{status:400});if(m&&!L)return console.warn("[GERAR_DOCUMENTO][VALIDACAO_CLIENTE_NAO_ENCONTRADO]",{normalizedClientId:m}),Response.json({error:"Cliente não encontrado."},{status:400});let V=L?.id||null,G=L?.name||$,j=(t=O(U),o=function(e,a=new Date){let{localFormatado:t}=O(e),o=function(e=new Date){return e.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"})}(a);return`${t}, ${o}`}(U),r=t.cidade?`use exatamente "${t.localFormatado}" (nunca omita a cidade; nunca escreva s\xf3 "/${t.uf}" ou s\xf3 "${t.uf}")`:t.uf?`a cidade do escrit\xf3rio n\xe3o est\xe1 cadastrada — use apenas "${t.uf}" (ex.: "${t.uf}, 16 de julho de 2025"), NUNCA escreva "/${t.uf}" nem "undefined/${t.uf}"`:"use [Cidade]/[UF] apenas se os dados forem conhecidos; não invente cidade",n=({"salario-maternidade-rural":(i=`
DADOS DO ADVOGADO (use obrigatoriamente no cabe\xe7alho e pedidos):
  Nome: ${U?.name||""}
  OAB: ${U?.oab_number||""}/${U?.oab_uf||""}
  Email: ${U?.email||""}
  WhatsApp: ${U?.whatsapp||""}
  Cidade: ${t.cidade||"(não cadastrada)"}
  UF: ${t.uf||""}
  Local formatado: ${t.localFormatado||"(incompleto)"}
  Exemplo de linha de local/data: ${o}
  Vara: ${U?.vara_padrao||""}
  Honor\xe1rios: ${U?.honorarios_pct??""}%

LOCAL/DATA E COMARCA:
  - ${r}
  - Formato da linha de assinatura: "${t.localFormatado||"[Cidade]/[UF]"}, [data por extenso]."
  - Na comarca: "COMARCA DE ${t.localFormatado||"[Cidade]/[UF]"}"`)+D})[s]??i+"\nGere o documento solicitado de forma profissional e completa.","salario-maternidade-rural"===s?n+C:n+g+C),H=new f.default({apiKey:process.env.ANTHROPIC_API_KEY}),k=new TextEncoder,B="",z=new ReadableStream({async start(e){try{for await(let a of H.messages.stream({model:"claude-sonnet-4-6",max_tokens:6e3,system:j,messages:[{role:"user",content:JSON.stringify(u)}]}))"content_block_delta"===a.type&&"text_delta"===a.delta.type&&(B+=a.delta.text,e.enqueue(k.encode(a.delta.text)));let{data:a}=await S.from("documents").insert({lawyer_id:R.id,client_id:V,client_name:G,agent_type:s,title:u.nome?`Peti\xe7\xe3o — ${u.nome}`:s,content:B,form_data:u,status:"generated",lawyer_snapshot:{name:U.name,oab_number:U.oab_number,oab_uf:U.oab_uf,email:U.email,whatsapp:U.whatsapp,cidade:U.cidade,estado:U.estado||U.oab_uf,logo_url:U.logo_url,signature_url:U.signature_url,banner_url:U.banner_url,honorarios_pct:U.honorarios_pct,vara_padrao:U.vara_padrao,cor_peticao:U.cor_peticao,estilo_peticao:"classico"===U.estilo_peticao?"classico":"moderno"}}).select("id").single();V&&await (0,v.registrarContato)(V,{db:S});let t={lawyer_id:R.id,title:"Nova petição gerada com sucesso!",type:"success"},{error:o}=await S.from("notifications").insert({...t,document_id:a?.id??null,status:"done",progress:100});o&&await S.from("notifications").insert(t),await S.from("audit_logs").insert({lawyer_id:R.id,action:"GERAR_PETICAO",resource:"documents",details:{tipo:u?.agente||"petição"}})}catch(t){console.error("[GERAR_DOCUMENTO][STREAM_ERRO]",{err:M(t),agentType:s,clientId:V}),console.error("[GERAR_DOCUMENTO][STREAM_BODY]",b(a)),e.enqueue(k.encode("[ERRO_GERACAO]"))}finally{e.close()}}});return new Response(z,{headers:{"Content-Type":"text/plain; charset=utf-8"}})}catch(e){return console.error("[GERAR_DOCUMENTO][POST_ERRO]",{err:M(e)}),a?console.error("[GERAR_DOCUMENTO][POST_BODY]",b(a)):console.error("[GERAR_DOCUMENTO][POST_BODY]",String(a)),Response.json({error:"Erro ao gerar petição. Verifique os dados do cliente."},{status:400})}}e.s(["POST",0,w,"runtime",0,"nodejs"],993734);var U=e.i(993734);let P=new a.AppRouteRouteModule({definition:{kind:t.RouteKind.APP_ROUTE,page:"/api/gerar-documento/route",pathname:"/api/gerar-documento",filename:"route",bundlePath:""},distDir:".next-dashboard",relativeProjectDir:"",resolvedPagePath:"[project]/preveia/app/api/gerar-documento/route.ts",nextConfigOutput:"",userland:U,...{}}),{workAsyncStorage:L,workUnitAsyncStorage:F,serverHooks:y}=P;async function q(e,a,o){o.requestMeta&&(0,r.setRequestMeta)(e,o.requestMeta),P.isDev&&(0,r.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let f="/api/gerar-documento/route";f=f.replace(/\/index$/,"")||"/";let I=await P.prepare(e,a,{srcPage:f,multiZoneDraftMode:!1});if(!I)return a.statusCode=400,a.end("Bad Request"),null==o.waitUntil||o.waitUntil.call(o,Promise.resolve()),null;let{buildId:N,deploymentId:_,params:O,nextConfig:C,parsedUrl:g,isDraftMode:D,prerenderManifest:T,routerServerContext:h,isOnDemandRevalidate:v,revalidateOnlyGenerated:S,resolvedPathname:b,clientReferenceManifest:M,serverActionsManifest:w}=I,U=(0,s.normalizeAppPath)(f),L=!!(T.dynamicRoutes[U]||T.routes[b]),F=async()=>((null==h?void 0:h.render404)?await h.render404(e,a,g,!1):a.end("This page could not be found"),null);if(L&&!D){let e=!!T.routes[b],a=T.dynamicRoutes[U];if(a&&!1===a.fallback&&!e){if(C.adapterPath)return await F();throw new A.NoFallbackError}}let y=null;!L||P.isDev||D||(y="/index"===(y=b)?"/":y);let q=!0===P.isDev||!L,$=L&&!q;w&&M&&(0,n.setManifestsSingleton)({page:f,clientReferenceManifest:M,serverActionsManifest:w});let V=e.method||"GET",G=(0,i.getTracer)(),j=G.getActiveScopeSpan(),H=!!(null==h?void 0:h.isWrappedByNextServer),k=!!(0,r.getRequestMeta)(e,"minimalMode"),B=(0,r.getRequestMeta)(e,"incrementalCache")||await P.getIncrementalCache(e,C,T,k);null==B||B.resetRequestCache(),globalThis.__incrementalCache=B;let z={params:O,previewProps:T.preview,renderOpts:{experimental:{authInterrupts:!!C.experimental.authInterrupts},cacheComponents:!!C.cacheComponents,supportsDynamicResponse:q,incrementalCache:B,cacheLifeProfiles:C.cacheLife,waitUntil:o.waitUntil,onClose:e=>{a.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(a,t,o,r)=>P.onRequestError(e,a,o,r,h)},sharedContext:{buildId:N,deploymentId:_}},J=new d.NodeNextRequest(e),X=new d.NodeNextResponse(a),K=l.NextRequestAdapter.fromNodeNextRequest(J,(0,l.signalFromNodeResponse)(a));try{let r,n=async e=>P.handle(K,z).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":a.statusCode,"next.rsc":!1});let t=G.getRootSpanAttributes();if(!t)return;if(t.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${t.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let o=t.get("next.route");if(o){let a=`${V} ${o}`;e.setAttributes({"next.route":o,"http.route":o,"next.span_name":a}),e.updateName(a),r&&r!==e&&(r.setAttribute("http.route",o),r.updateName(a))}else e.updateName(`${V} ${f}`)}),s=async r=>{var i,s;let d=async({previousCacheEntry:t})=>{try{if(!k&&v&&S&&!t)return a.statusCode=404,a.setHeader("x-nextjs-cache","REVALIDATED"),a.end("This page could not be found"),null;let i=await n(r);e.fetchMetrics=z.renderOpts.fetchMetrics;let s=z.renderOpts.pendingWaitUntil;s&&o.waitUntil&&(o.waitUntil(s),s=void 0);let d=z.renderOpts.collectedTags;if(!L)return await (0,m.sendResponse)(J,X,i,z.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),a=(0,p.toNodeOutgoingHttpHeaders)(i.headers);d&&(a[E.NEXT_CACHE_TAGS_HEADER]=d),!a["content-type"]&&e.type&&(a["content-type"]=e.type);let t=void 0!==z.renderOpts.collectedRevalidate&&!(z.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&z.renderOpts.collectedRevalidate,o=void 0===z.renderOpts.collectedExpire||z.renderOpts.collectedExpire>=E.INFINITE_CACHE?void 0:z.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:a},cacheControl:{revalidate:t,expire:o}}}}catch(a){throw(null==t?void 0:t.isStale)&&await P.onRequestError(e,a,{routerKind:"App Router",routePath:f,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:v})},!1,h),a}},l=await P.handleResponse({req:e,nextConfig:C,cacheKey:y,routeKind:t.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:T,isRoutePPREnabled:!1,isOnDemandRevalidate:v,revalidateOnlyGenerated:S,responseGenerator:d,waitUntil:o.waitUntil,isMinimalMode:k});if(!L)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(s=l.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});k||a.setHeader("x-nextjs-cache",v?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),D&&a.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let c=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return k&&L||c.delete(E.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||a.getHeader("Cache-Control")||c.get("Cache-Control")||c.set("Cache-Control",(0,x.getCacheControlHeader)(l.cacheControl)),await (0,m.sendResponse)(J,X,new Response(l.value.body,{headers:c,status:l.value.status||200})),null};H&&j?await s(j):(r=G.getActiveScopeSpan(),await G.withPropagatedContext(e.headers,()=>G.trace(c.BaseServerSpan.handleRequest,{spanName:`${V} ${f}`,kind:i.SpanKind.SERVER,attributes:{"http.method":V,"http.target":e.url}},s),void 0,!H))}catch(a){if(a instanceof A.NoFallbackError||await P.onRequestError(e,a,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:v})},!1,h),L)throw a;return await (0,m.sendResponse)(J,X,new Response(null,{status:500})),null}}e.s(["handler",0,q,"patchFetch",0,function(){return(0,o.patchFetch)({workAsyncStorage:L,workUnitAsyncStorage:F})},"routeModule",0,P,"serverHooks",0,y,"workAsyncStorage",0,L,"workUnitAsyncStorage",0,F],842655)}];

//# sourceMappingURL=05m__next_dist_esm_build_templates_app-route_1wssmm_.js.map