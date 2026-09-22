import { NextResponse } from 'next/server';
// Public administrative provisioning was removed. This route grants no access.
export async function POST() { return NextResponse.json({error:'Este recurso não está disponível.'},{status:410}); }
