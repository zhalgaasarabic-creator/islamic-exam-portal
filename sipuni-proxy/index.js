// Cloudflare Worker — Sipuni CORS Proxy
// deploy: https://workers.cloudflare.com (тегін)

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const from = url.searchParams.get('date_from') || '';
    const to = url.searchParams.get('date_to') || '';
    const key = '0.seqs3t071cd';

    const sipuniUrl = `https://app.sipuni.com/API/statistics?key=${key}&type=calls&date_from=${from}&date_to=${to}&format=csv`;

    try {
      const res = await fetch(sipuniUrl, {
        headers: { 'User-Agent': 'SipuniProxy/1.0' }
      });
      const body = await res.text();

      return new Response(body, {
        status: res.status,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Cache-Control': 'no-cache',
        }
      });
    } catch (e) {
      return new Response('Error: ' + e.message, { status: 500 });
    }
  }
};
