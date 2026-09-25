export default function handler(req, res) {
  res.status(200);
  res.setHeader(
    "Content-Type",
    "text/plain; charset=utf-8"
  );
  res.setHeader(
    "Cache-Control",
    "public, max-age=3600, must-revalidate"
  );

  res.end(
    "User-agent: *\n" +
    "Allow: /\n" +
    "Sitemap: https://todo-nine-mu-94.vercel.app/sitemap.xml\n"
  );
}
