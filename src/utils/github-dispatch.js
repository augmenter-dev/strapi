const token = process.env.GITHUB_WEBHOOK_TOKEN; // PAT GitHub
const apiUrl = `https://api.github.com/repos/Oltre-dev/oltre-news-front/actions/workflows/deploy.yml/dispatches`;

module.exports = async (ref = "main") => {
  return;
  // await fetch(apiUrl, {
  //   method: "POST",
  //   headers: {
  //     Accept: "application/vnd.github.v3+json",
  //     "Content-Type": "text/plain; charset=utf-8",
  //     Authorization: `Bearer ${token}`,
  //     "User-Agent": "strapi5-webhook",
  //   },
  //   body: JSON.stringify({ ref }),
  // }).then((r) => {
  //   if (!r.ok) {
  //     strapi.log.error(
  //       `GitHub workflow dispatch failed: ${r.status} ${r.statusText}`
  //     );
  //   }
  // });
};
