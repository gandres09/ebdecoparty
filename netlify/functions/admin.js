"use strict";
/*
  Backend del panel /admin de EB Decoparty.
  Recibe fotos y las guarda en el repositorio de GitHub (carpeta fotos/ y lista fotos.json).
  Cada publicación es un solo commit, así Netlify hace un solo despliegue.

  Variables de entorno (Netlify > Site configuration > Environment variables):
    ADMIN_PASSWORD  contraseña del panel
    GITHUB_TOKEN    token de GitHub con permiso Contents: Read and write sobre el repositorio
    GITHUB_REPO     opcional, por defecto gandres09/ebdecoparty
    GITHUB_BRANCH   opcional, por defecto main
*/
const crypto = require("crypto");

const REPO = process.env.GITHUB_REPO || "gandres09/ebdecoparty";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const MAX_TEMAS = 12;
const MAX_B64 = 4 * 1024 * 1024;
const MAX_ITEMS = 30;

function reply(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

function sameSecret(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

async function gh(path, method, payload) {
  const res = await fetch("https://api.github.com/repos/" + REPO + path, {
    method: method || "GET",
    headers: {
      Authorization: "Bearer " + process.env.GITHUB_TOKEN,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ebdecoparty-admin",
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!res.ok) {
    const err = new Error((data && data.message) || "GitHub " + res.status);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function readList() {
  try {
    const f = await gh("/contents/fotos.json?ref=" + encodeURIComponent(BRANCH));
    const list = JSON.parse(Buffer.from(f.content, "base64").toString("utf8"));
    return Array.isArray(list) ? list : [];
  } catch (e) {
    if (e.status === 404) return [];
    throw e;
  }
}

function cleanTitle(t) {
  return String(t || "").replace(/[\u0000-\u001f<>"]/g, "").trim().slice(0, 60);
}

function cleanTema(t) {
  const x = String(t || "").replace(/[\u0000-\u001f<>"&]/g, "").replace(/\s+/g, " ").trim().slice(0, 30);
  return x.charAt(0).toUpperCase() + x.slice(1);
}

function normTema(t) {
  return String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function friendly(e) {
  if (e.status === 401 || e.status === 403) return "GitHub no aceptó el token. Puede estar vencido o sin permiso de escritura.";
  if (e.status === 404) return "No encuentro el repositorio. Revisá GITHUB_REPO y el permiso del token.";
  if (e.status === 409 || e.status === 422) return "Se hizo otro cambio al mismo tiempo. Probá de nuevo.";
  return "No se pudo completar. Probá de nuevo en un momento.";
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Método no permitido" });
  if (!process.env.ADMIN_PASSWORD || !process.env.GITHUB_TOKEN) {
    return reply(500, { error: "Falta configurar el panel (contraseña o token en Netlify)." });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return reply(400, { error: "Pedido inválido" }); }

  if (!sameSecret(body.password || "", process.env.ADMIN_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 1200));
    return reply(401, { error: "Contraseña incorrecta" });
  }

  try {
    switch (body.action) {
      case "check":
        return reply(200, { ok: true });

      case "list":
        return reply(200, { fotos: await readList() });

      case "blob": {
        const data = String(body.data || "");
        if (!data) return reply(400, { error: "Falta la foto" });
        if (data.length > MAX_B64) return reply(413, { error: "La foto es muy pesada" });
        const head = Buffer.from(data.slice(0, 8), "base64");
        if (!(head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)) {
          return reply(400, { error: "La foto tiene que ser JPG" });
        }
        const blob = await gh("/git/blobs", "POST", { content: data, encoding: "base64" });
        return reply(200, { sha: blob.sha });
      }

      case "publish": {
        const add = Array.isArray(body.add) ? body.add : [];
        const remove = Array.isArray(body.remove) ? body.remove : [];
        if (add.length > MAX_ITEMS || remove.length > MAX_ITEMS) return reply(400, { error: "Son demasiadas fotos juntas" });
        if (!add.length && !remove.length) return reply(400, { error: "No hay cambios para publicar" });
        for (const a of add) {
          if (!a || !/^[0-9a-f]{40}$/.test(a.sha || "") || !cleanTema(a.tema)) {
            return reply(400, { error: "Hay una foto sin tema" });
          }
        }

        const ref = await gh("/git/ref/heads/" + BRANCH);
        const headSha = ref.object.sha;
        const commit = await gh("/git/commits/" + headSha);
        let next = await readList();

        const entries = [];
        for (const file of remove) {
          if (typeof file !== "string" || !/^fotos\/[a-z0-9-]+\.jpg$/.test(file)) continue;
          if (!next.some((f) => f.file === file)) continue;
          next = next.filter((f) => f.file !== file);
          entries.push({ path: file, mode: "100644", type: "blob", sha: null });
        }

        const known = {};
        next.forEach((f) => { if (f.tema && !known[normTema(f.tema)]) known[normTema(f.tema)] = f.tema; });

        const created = [];
        for (const a of add) {
          const label = cleanTema(a.tema);
          const key = normTema(label);
          if (!known[key]) known[key] = label;
          const id = Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex");
          const file = "fotos/" + id + ".jpg";
          entries.push({ path: file, mode: "100644", type: "blob", sha: a.sha });
          created.push({ file: file, tema: known[key], titulo: cleanTitle(a.titulo) });
        }
        next = created.concat(next);

        const used = {};
        next.forEach((f) => { if (f.tema) used[normTema(f.tema)] = 1; });
        if (Object.keys(used).length > MAX_TEMAS) {
          return reply(400, { error: "Son demasiados temas distintos (máximo " + MAX_TEMAS + "). Usá uno que ya exista." });
        }

        entries.push({ path: "fotos.json", mode: "100644", type: "blob", content: JSON.stringify(next, null, 2) + "\n" });
        const tree = await gh("/git/trees", "POST", { base_tree: commit.tree.sha, tree: entries });
        const made = await gh("/git/commits", "POST", {
          message: "Actualiza las fotos desde el panel",
          tree: tree.sha,
          parents: [headSha],
        });
        await gh("/git/refs/heads/" + BRANCH, "PATCH", { sha: made.sha });
        return reply(200, { ok: true, fotos: next });
      }

      default:
        return reply(400, { error: "Acción desconocida" });
    }
  } catch (e) {
    return reply(502, { error: friendly(e) });
  }
};
