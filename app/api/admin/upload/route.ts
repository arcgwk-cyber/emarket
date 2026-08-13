import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const productName = formData.get('productName') as string || 'product';
    const weightG = formData.get('weightG') as string || '0';

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Clean product name to generate filesystem safe naming conventions
    const cleanName = productName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/__+/g, '_')
      .replace(/^_+|_+$/g, '');
    
    // Preserve PNG format or fallback to jpeg
    const ext = file.type === 'image/png' ? 'png' : 'jpeg';
    const filename = `${cleanName || 'product'}_${weightG || '0'}g.${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Attempt local storage write
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, buffer);
      
      return NextResponse.json({
        success: true,
        url: `/uploads/${filename}`,
        storageType: 'file',
      });
    } catch (fsErr) {
      console.warn('Filesystem write not available. Defaulting to base64 fallback:', fsErr);
      return NextResponse.json({
        success: false,
        fallback: true,
        message: 'Server storage is read-only. Saving as database inline image.',
      });
    }
  } catch (err: any) {
    console.error('File upload handler error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
