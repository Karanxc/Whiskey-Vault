const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

function createSimplePDF(title, distillery, vintage, cask, hash) {
  const contentStream = `BT
/F1 18 Tf
50 740 Td
(WHISKEY VAULT - CRYPTOGRAPHIC PROVENANCE CERTIFICATE) Tj
/F1 12 Tf
0 -40 Td
(Title: ${title.replace(/[()]/g, '')}) Tj
0 -25 Td
(Distillery: ${distillery.replace(/[()]/g, '')}) Tj
0 -25 Td
(Vintage / Age: ${vintage.replace(/[()]/g, '')}) Tj
0 -25 Td
(Cask / Serial: ${cask.replace(/[()]/g, '')}) Tj
0 -35 Td
(IPFS CID: ${hash}) Tj
0 -25 Td
(Blockchain Verification: Recorded on Ethereum Smart Contract) Tj
0 -40 Td
(Status: Cryptographically Notarized & Verified Authentic) Tj
ET`;

  const streamLength = Buffer.byteLength(contentStream);

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${contentStream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000${(295 + streamLength).toString().padStart(3, '0')} 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
${(360 + streamLength)}
%%EOF`;

  return Buffer.from(pdf);
}

const certs = [
  {
    filename: 'macallan_1926_cask263_certificate.pdf',
    title: 'The Macallan 1926 60-Year-Old Valerio Adami',
    distillery: 'The Macallan Distillery, Craigellachie',
    vintage: '1926 (60 Years Old)',
    cask: 'Cask #263 - First-Fill Sherry Butt',
    hash: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
  },
  {
    filename: 'springbank_1919_cask_deed.pdf',
    title: 'Springbank 1919 50-Year-Old Cask Deed of Ownership',
    distillery: 'Springbank Distillery, Campbeltown',
    vintage: '1919 (50 Years Old)',
    cask: 'Dunnage Warehouse #3 Cask Title',
    hash: 'bafybeihkoviema7g3gxyt6st7b32q3b3vwhk4zwhqfq7bovvveegr24vwa'
  },
  {
    filename: 'yamazaki_55_mizunara_provenance.pdf',
    title: 'Yamazaki 55-Year-Old Single Malt Distillation Provenance',
    distillery: 'Yamazaki Distillery, Osaka',
    vintage: '1960 (55 Years Old)',
    cask: 'Japanese Mizunara Oak Cask',
    hash: 'bafybeidb7q2o4h2xkm64tkm6tquv7j5s6l3xptwfvptq43vewrtg4x5mte'
  },
  {
    filename: 'black_bowmore_1964_assay.pdf',
    title: 'Bowmore 1964 Black Bowmore 1st Edition Chemical Assay',
    distillery: 'Bowmore Distillery, Islay',
    vintage: '1964 (29 Years Old)',
    cask: 'Oloroso Sherry Butt #2116',
    hash: 'bafybeie274vkmj3tx5q67kpv64tm6v2wvhfqzwtk4pvtvq6vweqr24xmye'
  }
];

certs.forEach(c => {
  const filePath = path.join(uploadsDir, c.filename);
  const pdfBuffer = createSimplePDF(c.title, c.distillery, c.vintage, c.cask, c.hash);
  fs.writeFileSync(filePath, pdfBuffer);
  console.log(`Created certificate: ${filePath}`);
});

// Update data/records.json to link to these files
const recordsPath = path.join(__dirname, '..', 'data', 'records.json');
if (fs.existsSync(recordsPath)) {
  const records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
  records.forEach(r => {
    if (r.filename) {
      r.savedPath = path.join(uploadsDir, r.filename);
      r.fileUrl = `/uploads/${r.filename}`;
      r.originalFilename = r.filename;
    }
  });
  fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));
  console.log('Updated records.json with local certificate paths.');
}
