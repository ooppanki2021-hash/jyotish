/* ============================================================
   Cloudflare Worker-прокси для GigaChat (Сбер) — бесплатно.
   Нужен, потому что браузер не может сам получить токен
   GigaChat (нужен Client Secret, а светить его в коде нельзя).

   Как поставить:
   1) На https://developers.sber.ru/ создайте проект GigaChat API
      и получите Client ID и Client Secret.
   2) На https://dash.cloudflare.com/ создайте бесплатный Worker,
      вставьте ЦЕЛИКОМ этот файл.
   3) Settings → Variables and Secrets → добавьте ДВЕ переменные:
      GIGACHAT_CLIENT_ID   = ваш Client ID
      GIGACHAT_CLIENT_SECRET = ваш Client Secret
   4) Deploy.
   5) На сайте: провайдер «GigaChat», в поле Base URL вставьте
      адрес вида https://ВАШ-ВОРКЕР.ВАШ-ЛОГИН.workers.dev
      (поле API-ключ оставьте пустым).

   Лимит: ~1 млн токенов в месяц бесплатно.
   ============================================================ */
async function getToken(env) {
  const res = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(env.GIGACHAT_CLIENT_ID + ':' + env.GIGACHAT_CLIENT_SECRET),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: 'scope=GIGACHAT_API'
  });
  if (!res.ok) throw new Error('OAuth HTTP ' + res.status);
  const data = await res.json();
  return data.access_token;
}

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }
    try {
      const { model, messages } = await request.json();
      const token = await getToken(env);
      const res = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'Rq-UID': crypto.randomUUID()
        },
        body: JSON.stringify({ model: model || 'GigaChat', messages })
      });
      if (!res.ok) {
        const t = await res.text();
        return new Response(JSON.stringify({ error: 'GigaChat HTTP ' + res.status + ': ' + t.slice(0, 400) }), {
          status: 502, headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
      const data = await res.json();
      // формат совместим с OpenAI: choices[0].message.content
      return new Response(JSON.stringify(data), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }
  }
};
