const MIME_BY_EXT: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    zip: 'application/zip',
};

export function inferAcceptTypes(label: string, fieldType: string): string[] | undefined {
    if (fieldType !== 'file') return undefined;
    const l = label.toLowerCase();
    if (l.includes('pdf') && !l.includes('ppt')) return ['.pdf'];
    if (l.includes('ppt')) return ['.ppt', '.pptx'];
    if (l.includes('image') || l.includes('png')) return ['.png', '.jpg', '.jpeg'];
    return undefined;
}

export function fileMatchesAcceptTypes(file: File, acceptTypes: string[]): boolean {
    if (!acceptTypes.length) return true;
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    return acceptTypes.some((raw) => {
        const allowed = raw.replace('.', '').toLowerCase();
        if (fileExt === allowed) return true;
        const mime = MIME_BY_EXT[allowed];
        if (mime && file.type === mime) return true;
        if (allowed === 'pdf' && file.type.includes('pdf')) return true;
        if ((allowed === 'ppt' || allowed === 'pptx') && file.type.includes('presentation')) return true;
        return false;
    });
}
