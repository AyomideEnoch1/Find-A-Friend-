async function test() {
  try {
    const res = await fetch('https://www.fafcampus.site/pwa/index.html');
    console.log('PWA index.html HTTP Status:', res.status);
    if (res.status === 200) {
      console.log('PWA index.html loaded successfully!');
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
test();
