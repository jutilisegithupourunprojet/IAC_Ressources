// Point de départ de la connexion GitHub pour l'interface d'édition (/admin).
// Redirige vers la page d'autorisation GitHub, qui reviendra sur /api/callback.
module.exports = (req, res) => {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    res.statusCode = 500;
    res.end('GITHUB_OAUTH_CLIENT_ID manquant dans les variables d\'environnement Vercel.');
    return;
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const redirectUri = `${proto}://${host}/api/callback`;
  const state = Math.random().toString(36).slice(2);

  const authorizeUrl =
    'https://github.com/login/oauth/authorize' +
    `?client_id=${encodeURIComponent(clientId)}` +
    '&scope=repo,user' +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  res.writeHead(302, { Location: authorizeUrl });
  res.end();
};
