import { authenticatedClient, json, apiFailure, readBody, ApiError } from '@/lib/server/api';
import { profileSchema } from '@/lib/domain/validation';
export async function GET() {
  try {
    const {client,user} = await authenticatedClient();
    const {data,error} = await client.from('profiles').select('*').eq('id',user.id).single();
    if(error) throw error;
    return json({profile:data,email:user.email ?? ''});
  } catch(error) { return apiFailure(error); }
}
export async function PATCH(request: Request) {
  try {
    const {client,user} = await authenticatedClient(request);
    const parsed = profileSchema.safeParse(await readBody(request));
    if(!parsed.success) throw new ApiError(400,parsed.error.issues[0].message);
    const {data,error} = await client.from('profiles').update(parsed.data).eq('id',user.id).select('*').single();
    if(error) throw error;
    return json({profile:data,email:user.email ?? ''});
  } catch(error) { return apiFailure(error); }
}
