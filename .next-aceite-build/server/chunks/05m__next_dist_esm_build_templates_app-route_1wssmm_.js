module.exports=[1334,e=>{"use strict";var a=e.i(76245),t=e.i(69629),o=e.i(85852),r=e.i(95369),n=e.i(94131),i=e.i(38008),s=e.i(17185),d=e.i(40564),l=e.i(74714),c=e.i(17608),u=e.i(36036),p=e.i(13489),m=e.i(85503),x=e.i(36142),E=e.i(71289),A=e.i(93695);e.i(37708);var R=e.i(57162),f=e.i(54567),h=e.i(47152);function I(e){let a=String(e?.cidade||e?.city||"").trim(),t=String(e?.estado||e?.state||e?.oab_uf||"").trim().toUpperCase();return a&&t?{cidade:a,uf:t,localFormatado:`${a}/${t}`}:a?{cidade:a,uf:t,localFormatado:a}:t?{cidade:"",uf:t,localFormatado:t}:{cidade:"",uf:"",localFormatado:""}}let C=`

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
OAB/[UF] n\xba [n\xfamero]`,O=`
Voc\xea \xe9 um advogado previdenciarista especializado com 20 anos de experi\xeancia.
Gere uma PETI\xc7\xc3O INICIAL COMPLETA para Sal\xe1rio-Maternidade — Segurada Especial no JEF.

ESTRUTURA OBRIGAT\xd3RIA:

1. CABE\xc7ALHO:
   [Nome do advogado]
   OAB/[UF] n\xba [n\xfamero] • [email] • [WhatsApp]

2. AO JU\xcdZO FEDERAL DA VARA DO JUIZADO ESPECIAL FEDERAL DA SUBSE\xc7\xc3O
   JUDICI\xc1RIA DA COMARCA DE [Cidade]/[UF]

3. # SAL\xc1RIO-MATERNIDADE — SEGURADA ESPECIAL / JU\xcdZO 100% DIGITAL

4. PRIORIDADES:
   ( ) Idoso(a) maior de 60 anos – Lei 10.741/2003
   ( ) Deficiente – Lei 12.008/2009
   ( ) Menor – Lei 8.069/1990

5. QUALIFICA\xc7\xc3O COMPLETA do cliente

6. ## I — PRELIMINARMENTE
   ### 1.1 Da Gratuidade da Justi\xe7a
   ### 1.2 Da Tutela de Urg\xeancia (se cab\xedvel)

7. ## A\xc7\xc3O PREVIDENCI\xc1RIA DE CONCESS\xc3O DE SAL\xc1RIO-MATERNIDADE (SEGURADA ESPECIAL)
   Em face do INSS...

8. ## II — QUADRO SIN\xd3PTICO (tabela com dados do caso)

9. ## III — S\xcdNTESE DO CONTEXTO F\xc1TICO (com linha do tempo)

10. ## IV — DAS PROVAS JUNTADAS AOS AUTOS (lista com ✓)

11. ## V — FUNDAMENTA\xc7\xc3O JUR\xcdDICA
    ### 5.1 Art. 71 Lei 8.213/1991
    ### 5.2 Art. 39 par\xe1grafo \xfanico Lei 8.213/1991
    ### 5.3 STF ADIs 2110 e 2111 — 28/03/2024
    ### 5.4 CF/88 art. 7\xba, XVIII
    ### 5.5 TNU S\xfamulas 41 e 6

12. ## VI — DOS PEDIDOS (i a viii) incluindo destaque de [honor\xe1rios]% para [nome advogado]

13. Valor da causa: R$ 6.072,00 (quatro vezes o sal\xe1rio m\xednimo de R$ 1.518,00)

14. Fechamento conforme regras de FECHAMENTO (local/data com cidade quando houver)

15. ## PLANILHA DE C\xc1LCULO: 4 meses \xd7 R$ 1.518,00 = R$ 6.072,00

REGRAS:
- Tom formal, humanizado e persuasivo
- Usar EXATAMENTE os dados fornecidos
- STF ADIs 28/03/2024 — citar sempre
- Use ## / ### apenas para t\xedtulos; corpo em texto corrido (sem JSON)
- Aproximadamente 6 p\xe1ginas A4
`;var v=e.i(30163),T=e.i(75987);let _=(0,h.createClient)("https://vqngqzfzrtfifbqltwai.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY);async function S(e){let a,t,o,r,{agentType:n,formData:i,clientId:s,clientName:d}=await e.json(),l=(e.headers.get("Authorization")||"").replace("Bearer ",""),c=e.headers.get("x-forwarded-for")||"unknown";if(!(0,T.rateLimit)(c,20,6e4))return Response.json({error:"Muitas requisições. Tente novamente em 1 minuto."},{status:429});let u=(0,h.createClient)("https://vqngqzfzrtfifbqltwai.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY),{data:{user:p},error:m}=await u.auth.getUser(l);if(m||!p)return Response.json({error:"unauthorized"},{status:401});let{data:x}=await u.from("lawyers").select("*").eq("id",p.id).single();if(x&&"cargo"in x&&!(0,v.temAcessoTotal)(x.cargo))return Response.json({error:"cargo_sem_permissao"},{status:403});let E=new Date(x.trial_expires_at)>new Date,A=x.docs_trial_used<5,R="trial"!==x.plan;if(!(E&&A||R))return Response.json({error:"trial_expired"},{status:403});let{data:S}=s?await u.from("clients").select("*").eq("id",s).eq("lawyer_id",p.id).single():{data:null},D=(d||i?.nome||"").trim();if(!s&&!D)return Response.json({error:"Informe um cliente cadastrado ou o nome manual do cliente."},{status:400});if(s&&!S)return Response.json({error:"Cliente não encontrado."},{status:400});let N=S?.id||null,w=S?.name||D,b=(a=I(x),t=function(e,a=new Date){let{localFormatado:t}=I(e),o=function(e=new Date){return e.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"})}(a);return t?`${t}, ${o}`:o}(x),o=a.cidade?`use exatamente "${a.localFormatado}" (nunca omita a cidade; nunca escreva s\xf3 "/${a.uf}" ou s\xf3 "${a.uf}")`:a.uf?`a cidade do escrit\xf3rio n\xe3o est\xe1 cadastrada — use apenas "${a.uf}" (ex.: "${a.uf}, 16 de julho de 2025"), NUNCA escreva "/${a.uf}" nem "undefined/${a.uf}"`:"use [Cidade]/[UF] apenas se os dados forem conhecidos; não invente cidade",(({"salario-maternidade-rural":(r=`
DADOS DO ADVOGADO (use obrigatoriamente no cabe\xe7alho e pedidos):
  Nome: ${x?.name||""}
  OAB: ${x?.oab_number||""}/${x?.oab_uf||""}
  Email: ${x?.email||""}
  WhatsApp: ${x?.whatsapp||""}
  Cidade: ${a.cidade||"(não cadastrada)"}
  UF: ${a.uf||""}
  Local formatado: ${a.localFormatado||"(incompleto)"}
  Exemplo de linha de local/data: ${t}
  Vara: ${x?.vara_padrao||""}
  Honor\xe1rios: ${x?.honorarios_pct??""}%

LOCAL/DATA E COMARCA:
  - ${o}
  - Formato da linha de assinatura: "${a.localFormatado||"[Cidade]/[UF]"}, [data por extenso]."
  - Na comarca: "COMARCA DE ${a.localFormatado||"[Cidade]/[UF]"}"`)+O})[n]??r+"\nGere o documento solicitado de forma profissional e completa.")+g+C),U=new f.default({apiKey:process.env.ANTHROPIC_API_KEY}),P=new TextEncoder,y="",M=new ReadableStream({async start(e){try{for await(let a of U.messages.stream({model:"claude-sonnet-4-6",max_tokens:6e3,system:b,messages:[{role:"user",content:JSON.stringify(i)}]}))"content_block_delta"===a.type&&"text_delta"===a.delta.type&&(y+=a.delta.text,e.enqueue(P.encode(a.delta.text)));let{data:a}=await u.from("documents").insert({lawyer_id:p.id,client_id:N,client_name:w,agent_type:n,title:i.nome?`Peti\xe7\xe3o — ${i.nome}`:n,content:y,form_data:i,status:"generated",lawyer_snapshot:{name:x.name,oab_number:x.oab_number,oab_uf:x.oab_uf,email:x.email,whatsapp:x.whatsapp,cidade:x.cidade,estado:x.estado||x.oab_uf,logo_url:x.logo_url,signature_url:x.signature_url,banner_url:x.banner_url,honorarios_pct:x.honorarios_pct,vara_padrao:x.vara_padrao,cor_peticao:x.cor_peticao,estilo_peticao:"classico"===x.estilo_peticao?"classico":"moderno"}}).select("id").single(),t={lawyer_id:p.id,title:"Nova petição gerada com sucesso!",type:"success"},{error:o}=await u.from("notifications").insert({...t,document_id:a?.id??null,status:"done",progress:100});o&&await u.from("notifications").insert(t),await _.from("audit_logs").insert({lawyer_id:p.id,action:"GERAR_PETICAO",resource:"documents",details:{tipo:i?.agente||"petição"}})}catch(a){e.enqueue(P.encode("[ERRO_GERACAO]"))}finally{e.close()}}});return new Response(M,{headers:{"Content-Type":"text/plain; charset=utf-8"}})}e.s(["POST",0,S,"runtime",0,"nodejs"],93734);var D=e.i(93734);let N=new a.AppRouteRouteModule({definition:{kind:t.RouteKind.APP_ROUTE,page:"/api/gerar-documento/route",pathname:"/api/gerar-documento",filename:"route",bundlePath:""},distDir:".next-aceite-build",relativeProjectDir:"",resolvedPagePath:"[project]/preveia/app/api/gerar-documento/route.ts",nextConfigOutput:"",userland:D,...{}}),{workAsyncStorage:w,workUnitAsyncStorage:b,serverHooks:U}=N;async function P(e,a,o){o.requestMeta&&(0,r.setRequestMeta)(e,o.requestMeta),N.isDev&&(0,r.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let f="/api/gerar-documento/route";f=f.replace(/\/index$/,"")||"/";let h=await N.prepare(e,a,{srcPage:f,multiZoneDraftMode:!1});if(!h)return a.statusCode=400,a.end("Bad Request"),null==o.waitUntil||o.waitUntil.call(o,Promise.resolve()),null;let{buildId:I,deploymentId:C,params:g,nextConfig:O,parsedUrl:v,isDraftMode:T,prerenderManifest:_,routerServerContext:S,isOnDemandRevalidate:D,revalidateOnlyGenerated:w,resolvedPathname:b,clientReferenceManifest:U,serverActionsManifest:P}=h,y=(0,s.normalizeAppPath)(f),M=!!(_.dynamicRoutes[y]||_.routes[b]),L=async()=>((null==S?void 0:S.render404)?await S.render404(e,a,v,!1):a.end("This page could not be found"),null);if(M&&!T){let e=!!_.routes[b],a=_.dynamicRoutes[y];if(a&&!1===a.fallback&&!e){if(O.adapterPath)return await L();throw new A.NoFallbackError}}let F=null;!M||N.isDev||T||(F="/index"===(F=b)?"/":F);let $=!0===N.isDev||!M,q=M&&!$;P&&U&&(0,i.setManifestsSingleton)({page:f,clientReferenceManifest:U,serverActionsManifest:P});let H=e.method||"GET",G=(0,n.getTracer)(),j=G.getActiveScopeSpan(),k=!!(null==S?void 0:S.isWrappedByNextServer),V=!!(0,r.getRequestMeta)(e,"minimalMode"),B=(0,r.getRequestMeta)(e,"incrementalCache")||await N.getIncrementalCache(e,O,_,V);null==B||B.resetRequestCache(),globalThis.__incrementalCache=B;let J={params:g,previewProps:_.preview,renderOpts:{experimental:{authInterrupts:!!O.experimental.authInterrupts},cacheComponents:!!O.cacheComponents,supportsDynamicResponse:$,incrementalCache:B,cacheLifeProfiles:O.cacheLife,waitUntil:o.waitUntil,onClose:e=>{a.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(a,t,o,r)=>N.onRequestError(e,a,o,r,S)},sharedContext:{buildId:I,deploymentId:C}},K=new d.NodeNextRequest(e),z=new d.NodeNextResponse(a),X=l.NextRequestAdapter.fromNodeNextRequest(K,(0,l.signalFromNodeResponse)(a));try{let r,i=async e=>N.handle(X,J).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":a.statusCode,"next.rsc":!1});let t=G.getRootSpanAttributes();if(!t)return;if(t.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${t.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let o=t.get("next.route");if(o){let a=`${H} ${o}`;e.setAttributes({"next.route":o,"http.route":o,"next.span_name":a}),e.updateName(a),r&&r!==e&&(r.setAttribute("http.route",o),r.updateName(a))}else e.updateName(`${H} ${f}`)}),s=async r=>{var n,s;let d=async({previousCacheEntry:t})=>{try{if(!V&&D&&w&&!t)return a.statusCode=404,a.setHeader("x-nextjs-cache","REVALIDATED"),a.end("This page could not be found"),null;let n=await i(r);e.fetchMetrics=J.renderOpts.fetchMetrics;let s=J.renderOpts.pendingWaitUntil;s&&o.waitUntil&&(o.waitUntil(s),s=void 0);let d=J.renderOpts.collectedTags;if(!M)return await (0,p.sendResponse)(K,z,n,J.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),a=(0,m.toNodeOutgoingHttpHeaders)(n.headers);d&&(a[E.NEXT_CACHE_TAGS_HEADER]=d),!a["content-type"]&&e.type&&(a["content-type"]=e.type);let t=void 0!==J.renderOpts.collectedRevalidate&&!(J.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&J.renderOpts.collectedRevalidate,o=void 0===J.renderOpts.collectedExpire||J.renderOpts.collectedExpire>=E.INFINITE_CACHE?void 0:J.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:a},cacheControl:{revalidate:t,expire:o}}}}catch(a){throw(null==t?void 0:t.isStale)&&await N.onRequestError(e,a,{routerKind:"App Router",routePath:f,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:D})},!1,S),a}},l=await N.handleResponse({req:e,nextConfig:O,cacheKey:F,routeKind:t.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:_,isRoutePPREnabled:!1,isOnDemandRevalidate:D,revalidateOnlyGenerated:w,responseGenerator:d,waitUntil:o.waitUntil,isMinimalMode:V});if(!M)return null;if((null==l||null==(n=l.value)?void 0:n.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(s=l.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});V||a.setHeader("x-nextjs-cache",D?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),T&&a.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let c=(0,m.fromNodeOutgoingHttpHeaders)(l.value.headers);return V&&M||c.delete(E.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||a.getHeader("Cache-Control")||c.get("Cache-Control")||c.set("Cache-Control",(0,x.getCacheControlHeader)(l.cacheControl)),await (0,p.sendResponse)(K,z,new Response(l.value.body,{headers:c,status:l.value.status||200})),null};k&&j?await s(j):(r=G.getActiveScopeSpan(),await G.withPropagatedContext(e.headers,()=>G.trace(c.BaseServerSpan.handleRequest,{spanName:`${H} ${f}`,kind:n.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},s),void 0,!k))}catch(a){if(a instanceof A.NoFallbackError||await N.onRequestError(e,a,{routerKind:"App Router",routePath:y,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:D})},!1,S),M)throw a;return await (0,p.sendResponse)(K,z,new Response(null,{status:500})),null}}e.s(["handler",0,P,"patchFetch",0,function(){return(0,o.patchFetch)({workAsyncStorage:w,workUnitAsyncStorage:b})},"routeModule",0,N,"serverHooks",0,U,"workAsyncStorage",0,w,"workUnitAsyncStorage",0,b],1334)}];

//# sourceMappingURL=05m__next_dist_esm_build_templates_app-route_1wssmm_.js.map