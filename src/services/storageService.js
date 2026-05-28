const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');
const path = require('path');

const client = new S3Client({
  region: process.env.OCI_REGION,
  endpoint: `https://${process.env.OCI_NAMESPACE}.compat.objectstorage.${process.env.OCI_REGION}.oraclecloud.com`,
  credentials: {
    accessKeyId: process.env.OCI_ACCESS_KEY,
    secretAccessKey: process.env.OCI_SECRET_KEY,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.OCI_BUCKET;
const BASE_URL = `https://objectstorage.${process.env.OCI_REGION}.oraclecloud.com/n/${process.env.OCI_NAMESPACE}/b/${process.env.OCI_BUCKET}/o`;

async function uploadArquivo(buffer, mimetype, pasta = 'uploads') {
  const ext = mimetype.split('/')[1] ?? 'jpg';
  const chave = `${pasta}/${randomUUID()}.${ext}`;

  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: chave,
    Body: buffer,
    ContentType: mimetype,
  }));

  return `${BASE_URL}/${encodeURIComponent(chave)}`;
}

async function deletarArquivo(url) {
  try {
    const chave = decodeURIComponent(url.split('/o/')[1]);
    if (!chave) return;
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: chave }));
  } catch {}
}

module.exports = { uploadArquivo, deletarArquivo };
