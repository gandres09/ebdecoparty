# EB Decoparty

Página de EB Decoparty (decoración de cumpleaños), publicada en Netlify.

## Panel para subir fotos

Entrar a `/admin` con la contraseña. Desde ahí se suben fotos, se elige o se crea el tema de cada una
(cada tema es una pestaña en la galería) y se pueden quitar fotos.

El panel guarda las fotos en la carpeta `fotos/` y la lista en `fotos.json`, con un solo commit por publicación.
Netlify republica la página solo a los pocos minutos.

### Configuración (una sola vez)

En Netlify, Site configuration > Environment variables:

| Variable | Valor |
| --- | --- |
| `ADMIN_PASSWORD` | La contraseña del panel. Mejor una larga, por ejemplo tres palabras. |
| `GITHUB_TOKEN` | Token fine-grained de GitHub, solo para este repositorio, permiso Contents: Read and write. |

Después de guardar las variables, hacer un nuevo despliegue (Deploys > Trigger deploy).
Opcionales: `GITHUB_REPO` (por defecto `gandres09/ebdecoparty`) y `GITHUB_BRANCH` (por defecto `main`).
