import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
/** Operator job endpoint. Never expose the service-role key or job secret to the mobile app. */
Deno.serve(async request => {
 const secret=Deno.env.get('DELETION_JOB_SECRET');
 const supplied=request.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(request.method!=='POST'||!secret||!supplied)return new Response('Unauthorized',{status:401});
 const digest=async(value:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 const [a,b]=await Promise.all([digest(secret),digest(supplied)]);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];if(difference)return new Response('Unauthorized',{status:401});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const retention=Number(Deno.env.get('DELETION_RETENTION_DAYS')??30);if(!Number.isInteger(retention)||retention<1||retention>365)return Response.json({error:'Invalid retention configuration'},{status:500});
 const before=new Date(Date.now()-retention*86400000).toISOString();
 const {data,error}=await admin.from('account_deletion_requests').select('user_id').is('completed_at',null).lt('requested_at',before).limit(20);
 if(error)return Response.json({error:'Could not load deletion requests'},{status:500});
 let processed=0;
 for(const entry of data??[]){
  const {error:authError}=await admin.auth.admin.updateUserById(entry.user_id,{email:`deleted+${entry.user_id}@account.invalid`,email_confirm:true,ban_duration:'876000h',user_metadata:{full_name:null,display_name:null,avatar_url:null}});
  if(authError)continue;
  const {error:doneError}=await admin.rpc('complete_account_anonymization',{p_user:entry.user_id});if(!doneError)processed++;
 }
 return Response.json({processed});
});
