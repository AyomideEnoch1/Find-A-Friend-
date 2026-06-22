const fs = require('fs');

const url = "https://storage.googleapis.com/eas-workflows-production/logs/c91925a9-42d3-43de-bc48-1bd279422541/1891d4d3-c698-4bd4-a257-a36ea33cfc16/2026-06-22T10%3A00%3A39Z-0b2751d9-c36b-4ca6-9448-4c23eff031c3.txt?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=www-production%40exponentjs.iam.gserviceaccount.com%2F20260622%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260622T101524Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&X-Goog-Signature=692bfd75cfee44e48c4bf9bb4ab1287cab2a11da6a94e173102e32cd0cd47727eb9f6bf00bc52f9085355e57c3847eb92ae0fdda8ca7db6a28660dc0ca32bd6c7be8643e754a6d217b198050da47fd83ca8e0a56dd96570545133e29c5ca5f9bdc17ce0cdeedc10031979e3e204ee473688029ff78bf662ab3c5e6ad1b3aa7064688239033a569e1baf156bc6a33b01855c85b26a9d6dd0a175c604928f945b6e06840c5430ca5f516c93c1cd5981bf208c357b812936f362a2f78377ec5ea6bfc811e30019e2e45e5829c696993ef075ddbfb5c70b5efdc7a615215f605d8d93859c80ad356ac6acb924f0c0253809841ff6e00ed240fb7ae36ce677eb1c535";

fetch(url)
  .then(res => res.text())
  .then(text => {
    fs.writeFileSync('scratch/full_build_log.txt', text);
    console.log("Download complete. Length:", text.length);
  })
  .catch(err => {
    console.error("Fetch error:", err);
  });
