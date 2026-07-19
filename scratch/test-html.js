async function test() {
  try {
    const res = await fetch('https://www.fafcampus.site/');
    const html = await res.text();
    const scriptTags = html.match(/<script[^>]*src="[^"]*"[^>]*>/g) || [];
    console.log('Script Tags found:', scriptTags);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
test();
