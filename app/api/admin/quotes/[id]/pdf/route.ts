import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getQuote } from '@/lib/db/quotes';
import { QuotePDF } from '@/lib/pdf/QuotePDF';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? process.env.ADMIN_SECRET ?? ''
    );
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });

  const logoBuffer = readFileSync(join(process.cwd(), 'public/images/logotipo.png'));
  const logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;

  const el = createElement(QuotePDF, { quote, logoSrc }) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(el);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${quote.quote_number}.pdf"`,
    },
  });
}
