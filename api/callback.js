// Retour de GitHub après autorisation : échange le code contre un jeton,
// vérifie que le compte est bien celui autorisé, puis le transmet à la
// fenêtre d'édition (/admin) par postMessage, selon le protocole attendu
// par Sveltia CMS / Decap CMS.
function sendHtml(res, script) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!DOCTYPE html><html><body><p style="font-family:sans-serif">Connexion en cours…</p><script>${script}</script></body></html>`);
}

module.exports = async (req, res) => {
  const { code } = req.query || {};
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  const allowedLogin = (process.env.ALLOWED_GITHUB_LOGIN || '').trim().toLowerCase();

  if (!code) {
    sendHtml(res, `document.body.textContent = ${JSON.stringify("Code d'autorisation manquant.")};`);
    return;
  }
  if (!clientId || !clientSecret) {
    sendHtml(res, `document.body.textContent = ${JSON.stringify('Configuration serveur incomplète (identifiants GitHub manquants).')};`);
    return;
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenJson = await tokenRes.json();

    if (!tokenJson.access_token) {
      sendHtml(
        res,
        `document.body.textContent = ${JSON.stringify(
          'Échec de connexion GitHub : ' + (tokenJson.error_description || 'jeton introuvable.')
        )};`
      );
      return;
    }
    const token = tokenJson.access_token;

    if (allowedLogin) {
      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}`, 'User-Agent': 'iac-ressources-cms' },
      });
      const user = await userRes.json();
      if (!user.login || user.login.toLowerCase() !== allowedLogin) {
        sendHtml(
          res,
          `document.body.textContent = ${JSON.stringify(
            "Ce compte GitHub n'est pas autorisé à modifier ce site."
          )};`
        );
        return;
      }
    }

    const message = 'authorization:github:success:' + JSON.stringify({ token, provider: 'github' });
    const script = `
      (function () {
        function receiveMessage(e) {
          window.opener.postMessage(${JSON.stringify(message)}, e.origin);
          window.removeEventListener('message', receiveMessage, false);
        }
        window.addEventListener('message', receiveMessage, false);
        window.opener.postMessage('authorizing:github', '*');
      })();
    `;
    sendHtml(res, script);
  } catch (err) {
    sendHtml(res, `document.body.textContent = ${JSON.stringify('Erreur serveur : ' + String(err))};`);
  }
};
