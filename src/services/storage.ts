export const archiveData = async (bucket: R2Bucket, key: string, data: any) => {
  const jsonString = JSON.stringify(data);
  const stream = new Blob([jsonString]).stream();
  
  // Compress using CompressionStream (available in Cloudflare Workers)
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  
  await bucket.put(`${key}.json.gz`, compressedStream, {
    httpMetadata: {
      contentType: 'application/gzip',
    },
  });
};
