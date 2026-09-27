const http = require('http');

http.get('http://localhost:3000', (res) => {
  console.log('HTTP Status:', res.statusCode);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Total HTML Bytes:', body.length);
    const imgMatches = body.match(/<img[^>]+src="([^">]+)"[^>]+alt="([^">]+)"/g) || [];
    console.log('Total <img> tags with alt:', imgMatches.length);
    imgMatches.forEach((tag, i) => {
      const srcMatch = tag.match(/src="([^">]+)"/);
      const altMatch = tag.match(/alt="([^">]+)"/);
      console.log(`[Image ${i + 1}] src: ${srcMatch ? srcMatch[1].substring(0, 55) + '...' : ''} | alt: "${altMatch ? altMatch[1] : ''}"`);
    });
    console.log('Has Stats Section:', body.includes('id="stats"'));
    console.log('Has Sourcing Visual:', body.includes('sourcing-visual-card'));
    console.log('Has Heavy Vehicle Feature:', body.includes('heavy-sourcing-card'));
    console.log('Has Gallery Section:', body.includes('id="gallery"'));
  });
}).on('error', err => console.error(err));
