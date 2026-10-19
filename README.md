# EB Decoparty

Página de EB Decoparty (decoración de cumpleaños), publicada con GitHub Pages.

Dirección: https://gandres09.github.io/ebdecoparty/

## Publicar con GitHub Pages (una sola vez)

1. El repositorio tiene que ser público: Settings > General > Danger Zone > Change visibility.
2. Settings > Pages > Build and deployment: Source "Deploy from a branch", rama `main`, carpeta `/ (root)`.
3. A los pocos minutos queda en la dirección de arriba.

## Panel para subir fotos

Entrar a `/admin/` (por ejemplo `https://gandres09.github.io/ebdecoparty/admin/`) con la clave de acceso.
Desde ahí se suben fotos, se elige o se crea el tema de cada una (cada tema es una pestaña en la galería)
y se pueden quitar fotos. Las fotos se guardan en `fotos/` y la lista en `fotos.json`, con un commit por publicación.
GitHub Pages republica la página solo, en uno o dos minutos.

### Clave de acceso

Es un token de GitHub solo para este repositorio. Se pega una vez en cada teléfono y queda guardado ahí.

1. GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token.
2. Repository access: Only select repositories > `ebdecoparty`.
3. Repository permissions: Contents > Read and write.
4. Expiration: la más larga que permita. Cuando venza hay que generar otra y pegarla de nuevo.

Quien tenga la clave puede cambiar las fotos de la página, así que se pasa solo a quienes la usan.
Si se pierde o se filtra, se borra el token desde GitHub y se genera otro.
