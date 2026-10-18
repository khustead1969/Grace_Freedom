const crypto=require('node:crypto');
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const publish=()=>process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||'';
const admin=()=>process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
function reply(res,status,obj){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
async function currentUser(req){const token=(req.headers.authorization||'').match(/^Bearer (.+)$/i)?.[1];if(!token||!base()||!publish())return null;const r=await fetch(base()+'/auth/v1/user',{headers:{apikey:publish(),Authorization:'Bearer '+token}});if(!r.ok)return null;const j=await r.json();return j.id?{user:j,token}:null}
async function rest(table,method,token,query='',body){let hdr={apikey:publish(),Authorization:'Bearer '+token,Accept:'application/json',Prefer:'return=representation','Content-Type':'application/json'};const r=await fetch(base()+'/rest/v1/'+table+query,{method,headers:hdr,body:body===undefined?undefined:JSON.stringify(body)});let data=await r.json().catch(()=>null);if(!r.ok)throw Error('Data service rejected request');return data}
const premium=(e)=>e&&['plus','family'].includes(e.tier)&&['active','trialing'].includes(e.status)&&(!e.current_period_end||new Date(e.current_period_end)>new Date());
async function entitlement(token,id){const rows=await rest('member_entitlements','GET',token,'?select=tier,status,current_period_end&user_id=eq.'+encodeURIComponent(id));return rows?.[0]||null}

async function stripeGet(resource){const r=await fetch('https://api.stripe.com/v1/'+resource,{headers:{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY}});const v=await r.json();if(!r.ok)throw Error('Stripe lookup failed');return v}
async function serviceRest(table,method,query='',body){const key=admin();if(!key)throw Error('Service role not configured');const r=await fetch(base()+'/rest/v1/'+table+query,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});const v=await r.json().catch(()=>null);if(!r.ok)throw Error('Database transaction failed');return v}
async function applyEvent(id,userId,tier,status,customer,subscription,session,periodEnd){
 const key=admin();const r=await fetch(base()+'/rest/v1/rpc/apply_member_payment_event',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_event_id:id,p_user_id:userId,p_tier:tier,p_status:status,p_customer_id:customer||null,p_subscription_id:subscription||null,p_session_id:session||null,p_period_end:periodEnd||null})});if(!r.ok)throw Error('Unable to reconcile entitlement');return await r.json().catch(()=>null);
}
async function beginCheckout(req,res,body,user){
 if(!user.email_confirmed_at)return reply(res,403,{message:'Please confirm your email before checkout.'});
 const prices={reset:process.env.STRIPE_PRICE_RESET,plus:process.env.STRIPE_PRICE_PLUS,family:process.env.STRIPE_PRICE_FAMILY};const plan=body.plan;
 if(!Object.hasOwn(prices,plan))return reply(res,400,{message:'Choose a valid plan.'});
 if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET||!admin()||!prices[plan]||!process.env.PUBLIC_URL)return reply(res,503,{message:'Secure checkout is not configured. Contact the site owner.'});
 const url=process.env.PUBLIC_URL.replace(/\/$/,'');if(!url.startsWith('https://'))return reply(res,503,{message:'Secure HTTPS public URL required.'});
 const mode=plan==='reset'?'payment':'subscription';const params=new URLSearchParams({'mode':mode,'line_items[0][price]':prices[plan],'line_items[0][quantity]':'1','success_url':url+'/membership.html?checkout=returned','cancel_url':url+'/membership.html?checkout=canceled','client_reference_id':user.id,'customer_email':user.email,'metadata[user_id]':user.id,'metadata[plan]':plan,'payment_method_types[0]':'card'});
 if(mode==='subscription'){params.set('subscription_data[metadata][user_id]',user.id);params.set('subscription_data[metadata][plan]',plan)}
 const r=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY,'Content-Type':'application/x-www-form-urlencoded'},body:params});const j=await r.json();if(!r.ok||!j.url)throw Error('Stripe checkout failed');return reply(res,200,{url:j.url});
}

async function handle(req,res,route,readBody){if(!route.startsWith('/api/private/'))return false; if(!base()||!publish())return reply(res,503,{message:'Supabase configuration is incomplete.'}),true;const verified=await currentUser(req);if(!verified)return reply(res,401,{message:'Please sign in.'}),true;const {user,token}=verified;try{
 if(route==='/api/private/checkout'&&req.method==='POST'){const body=await readBody(req);await beginCheckout(req,res,body,user);return true}
 if(route==='/api/private/me'&&req.method==='GET'){return reply(res,200,{id:user.id,email:user.email,membership:await entitlement(token,user.id)}),true}
 if(route==='/api/private/debts'&&req.method==='GET'){let rows=await rest('member_debts','GET',token,'?select=id,name,balance,apr,minimum_payment&order=created_at.asc');return reply(res,200,{debts:rows}),true}
 if(route==='/api/private/debts'&&req.method==='POST'){const b=await readBody(req);if(typeof b.name!=='string'||b.name.trim().length<1||b.name.length>100||![b.balance,b.apr,b.minimum_payment].every(x=>typeof x==='number'&&Number.isFinite(x))||b.balance<0||b.balance>1e9||b.apr<0||b.apr>100||b.minimum_payment<0||b.minimum_payment>1e9)return reply(res,400,{message:'Please enter valid debt details.'}),true;const rows=await rest('member_debts','POST',token,'',[{user_id:user.id,name:b.name.trim(),balance:b.balance,apr:b.apr,minimum_payment:b.minimum_payment}]);return reply(res,201,{debt:rows[0]}),true}
 if(route.startsWith('/api/private/debts/')&&req.method==='DELETE'){const id=route.split('/').pop();if(!/^[0-9a-f-]{36}$/i.test(id))return reply(res,400,{message:'Invalid ID'}),true;await rest('member_debts','DELETE',token,'?id=eq.'+id);return reply(res,200,{ok:true}),true}
 if(route==='/api/private/coach'&&req.method==='POST'){const e=await entitlement(token,user.id);if(!premium(e))return reply(res,403,{message:'An active Plus or Family plan is required.'}),true; if(!process.env.OPENAI_API_KEY)return reply(res,503,{message:'AI is not configured.'}),true;const b=await readBody(req);const question=String(b.message||'').trim().slice(0,1200);if(!question)return reply(res,400,{message:'Enter a question.'}),true;const faith=['Catholic','Christian','Faith-Light'].includes(b.faith)?b.faith:'Christian';const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4o-mini',max_tokens:400,messages:[{role:'system',content:`You are Grace, a faith-sensitive financial education companion. Preference: ${faith}. Do not offer regulated individualized advice or guarantees; prioritize food, housing and utilities, refer urgent hardship to qualified nonprofit counseling. Do not ask for financial account identifiers. For Catholic mode provide optional accurately attributed general prayers but never represent yourself as clergy. Never assume debt signals moral failure.`},{role:'user',content:question}]})});if(!r.ok)throw Error('AI currently unavailable');const j=await r.json();return reply(res,200,{reply:j.choices?.[0]?.message?.content||''}),true}
 return reply(res,404,{message:'Unknown endpoint'}),true
 }catch(e){return reply(res,500,{message:'Request failed. Check secure server configuration.'}),true}}
async function stripeWebhook(req,res){if(!process.env.STRIPE_WEBHOOK_SECRET||!admin()||!base())return reply(res,503,{message:'Webhook not configured'});let chunks=[];for await(const c of req){chunks.push(c);if(Buffer.concat(chunks).length>1000000)return reply(res,413,{message:'Too large'})}const payload=Buffer.concat(chunks);const sig=req.headers['stripe-signature']||'';const timestamp=sig.match(/(?:^|,)t=(\d+)/)?.[1];const provided=[...sig.matchAll(/(?:^|,)v1=([0-9a-f]+)/g)].map(v=>v[1]);if(!timestamp||Math.abs(Date.now()/1000-Number(timestamp))>300)return reply(res,400,{message:'Invalid signature time'});const digest=crypto.createHmac('sha256',process.env.STRIPE_WEBHOOK_SECRET).update(timestamp+'.').update(payload).digest('hex');if(!provided.some(x=>x.length===digest.length&&crypto.timingSafeEqual(Buffer.from(x),Buffer.from(digest))))return reply(res,400,{message:'Invalid signature'});let event;try{event=JSON.parse(payload)}catch{return reply(res,400,{message:'Malformed event'})}
 try{
 if(event.type==='checkout.session.completed'){
  const session=event.data?.object;const uid=session?.client_reference_id;const tier=session?.metadata?.plan;
  if(!uid||uid!==session?.metadata?.user_id||!['reset','plus','family'].includes(tier))throw Error('Unbound checkout');
  if(session.payment_status!=='paid')return reply(res,200,{received:true,pending:true});
  const expected=process.env['STRIPE_PRICE_'+tier.toUpperCase()];
  const line=await stripeGet('checkout/sessions/'+encodeURIComponent(session.id)+'/line_items?limit=10');
  if(!expected||line.data?.length!==1||line.data[0]?.price?.id!==expected)throw Error('Unexpected checkout line item');
  const verified=await serviceRest('member_entitlements','GET','?select=user_id&user_id=eq.'+encodeURIComponent(uid));
  // Supabase Auth admin lookup proves UUID corresponds to a real registered account.
  const key=admin();const u=await fetch(base()+'/auth/v1/admin/users/'+encodeURIComponent(uid),{headers:{apikey:key,Authorization:'Bearer '+key}});if(!u.ok)throw Error('No verified member account');const member=await u.json();if(!member.email_confirmed_at)throw Error('Member email not confirmed');
  const sub=session.subscription?await stripeGet('subscriptions/'+encodeURIComponent(session.subscription)):null;
  const period=sub?.items?.data?.[0]?.current_period_end||sub?.current_period_end;
  await applyEvent(event.id,uid,tier,'active',session.customer,session.subscription,session.id,period?new Date(period*1000).toISOString():null);
 }else if(['customer.subscription.updated','customer.subscription.deleted'].includes(event.type)){
  const sub=event.data?.object;const uid=sub?.metadata?.user_id;const tier=sub?.metadata?.plan;
  if(!uid||!['plus','family'].includes(tier)||!sub?.id)return reply(res,200,{received:true,ignored:true});
  const matching=await serviceRest('member_entitlements','GET','?select=user_id,stripe_subscription_id&user_id=eq.'+encodeURIComponent(uid));
  if(!matching.some(x=>x.stripe_subscription_id===sub.id))return reply(res,200,{received:true,ignored:true});
  const status=event.type==='customer.subscription.deleted'?'canceled':(['active','trialing','past_due','canceled'].includes(sub.status)?sub.status:'inactive');
  const period=sub.items?.data?.[0]?.current_period_end||sub.current_period_end;
  await applyEvent(event.id,uid,tier,status,sub.customer,sub.id,null,period?new Date(period*1000).toISOString():null);
 }else if(['invoice.payment_failed','invoice.paid'].includes(event.type)){
  // Checkout + subscription events remain the authority for access updates.
  console.log('Invoice event received',event.id,event.type);
 }
 return reply(res,200,{received:true});
 }catch(err){console.error('Stripe webhook reconciliation failed',event.id,err.message);return reply(res,500,{message:'Webhook processing failed; Stripe should retry.'})}}
module.exports={handle,stripeWebhook,currentUser};
