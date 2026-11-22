# Producción: guía paso a paso

Cómo se arma producción (decisiones [0030](../decisiones/0030-produccion.md) y [0031](../decisiones/0031-respaldos-en-google-drive.md)) y qué se hace cada mes. Todo pasa en paneles externos: el repositorio solo tiene los workflows, la plantilla del alta y el script de restauración.

> Nada de lo que se completa en esta guía (contraseñas, claves, correos, nombres) va al repositorio, porque es público.

En la guía, `<sitio>` es el nombre del sitio de producción en Netlify (por ejemplo `sifel-consultorio`) y `<ref>` es la referencia del proyecto de Supabase (sale en su URL). Elige el nombre del sitio antes de empezar: se usa desde el paso 3.

## 1. Las claves de los respaldos

Cada uno (el autor y la dentista) tiene su par de claves de [age](https://age-encryption.org).

1. Instala age: `scoop install age` o `winget install FiloSottile.age`.
2. Corre `age-keygen -o sifel-respaldo-<nombre>.txt`, una vez por persona.
3. Copia las dos líneas `# public key: age1...`. Esas son las **claves públicas**.
4. Guarda cada archivo, que tiene la **clave privada**, donde lo guarde su dueño: un gestor de contraseñas, más una copia en papel o en un USB. No va a GitHub ni a Drive. Si se pierden las dos, los respaldos no se pueden abrir.

## 2. Supabase: el proyecto

1. Crea un proyecto en el panel de Supabase.
   - **Nombre:** `sifel-produccion`.
   - **Región:** South America (São Paulo), sa-east-1.
   - Pon una contraseña de base larga y guárdala en el gestor de contraseñas.
2. En **Authentication → Sign In / Providers**:
   - Apaga **Allow new users to sign up**. Es obligatorio: sin esto, cualquiera con una cuenta de Google podría crear un usuario.
   - Deja apagado **Allow anonymous sign-ins**.
3. En **Authentication → URL Configuration**:
   - **Site URL:** `https://<sitio>.netlify.app`
   - **Redirect URLs:** `https://<sitio>.netlify.app/**`
4. En **Storage → S3 Configuration**, crea una **access key**. Se muestra una sola vez: guarda el *Access key ID* y el *Secret access key* para el paso 5.

## 3. Google: el cliente OAuth

En [Google Cloud Console](https://console.cloud.google.com), con tu cuenta:

1. Crea un proyecto llamado `Sifel`.
2. En **Google Auth Platform**:
   - **Branding:** nombre de la app `Sifel` y tu correo de soporte.
   - **Audience:** External. Después, **Publish app** para que quede *In production*. Con solo los permisos básicos (email y perfil) no pide verificación.
   - **Clients → Create client → Web application:**
     - **Authorized JavaScript origins:** `https://<sitio>.netlify.app`
     - **Authorized redirect URIs:** `https://<ref>.supabase.co/auth/v1/callback`
3. Copia el **Client ID** y el **Client secret**.
4. En Supabase, **Authentication → Sign In / Providers → Google**: actívalo y pega los dos valores.

## 4. Google Drive: dónde quedan los respaldos

1. Instala rclone: `scoop install rclone` o `winget install Rclone.Rclone`.
2. Corre `rclone config create drive drive scope drive.file`. Se abre el navegador: entra con la cuenta de Google donde van a quedar los respaldos.
3. Corre `rclone config show drive` y copia todo lo que imprime, desde la línea `[drive]`. Es el secreto `RCLONE_DRIVE_CONF` del paso 5.

Con `drive.file`, rclone solo ve lo que sube él: la carpeta `sifel-respaldos`, no el resto de tu Drive.

## 5. GitHub: environment, secretos y variables

En el repositorio, **Settings → Environments → New environment**:

1. Créalo con el nombre `produccion`.
2. En **Deployment branches**, elige *Selected branches* y agrega solo `main`.
3. Agrega estos **secretos** del environment:

| Secreto                     | Qué es                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PROD_DB_URL`               | En Supabase, el botón **Connect** → **Session pooler**: la URI con la contraseña del paso 2. Los runners de GitHub no tienen IPv6, por eso no sirve la conexión directa. |
| `PROD_S3_ACCESS_KEY_ID`     | Del paso 2.4.                                                                                                                                    |
| `PROD_S3_SECRET_ACCESS_KEY` | Del paso 2.4.                                                                                                                                    |
| `RCLONE_DRIVE_CONF`         | Del paso 4.3.                                                                                                                                    |

4. Agrega estas **variables** del environment:

| Variable                        | Qué es                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `PROYECTO_PRODUCCION`           | El `<ref>` del proyecto.                                                      |
| `PROD_SUPABASE_PUBLISHABLE_KEY` | En **Project Settings → API Keys**, la clave *publishable*. Es pública.       |
| `RESPALDO_CLAVES_PUBLICAS`      | Las dos claves `age1...` del paso 1, separadas por un espacio.                |

## 6. La primera publicación

En **Actions → Publicar en producción → Run workflow**, sobre `main`. Hace tres cosas:

- **Respalda.** La primera vez la base está vacía, y el workflow lo avisa sin fallar.
- **Aplica las migraciones.**
- **Crea la rama `produccion`.**

Revisa que en Drive haya aparecido `sifel-respaldos/base/`.

## 7. Las cuentas y el alta

1. En Supabase, **Authentication → Users → Add user → Create new user**, una vez para cada cuenta:
   - el correo de Google de la dentista;
   - el tuyo.

   Usa una contraseña larga al azar y marca **Auto Confirm User**.
2. En el **SQL Editor**, pega `supabase/produccion/alta.sql`, completa los cuatro datos del principio y córrelo. Tiene que terminar con "Listo: organización …, con 19 códigos …".

## 8. Netlify: el sitio de producción

1. **Add new site → Import an existing project**, con el mismo repositorio y el nombre `<sitio>`.
2. **Build settings:** los mismos que el sitio de la demo (copia el comando y el directorio base). Directorio de publicación: `apps/web/dist`.
3. **Production branch:** `produccion`. La demo sigue publicando `main`.
4. **Environment variables:**
   - `VITE_SUPABASE_URL=https://<ref>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=` la clave *publishable*
   - `VITE_ES_DEMO=false`
   - `VITE_GOOGLE_HABILITADO=true`

   Sin `VITE_DEMO_EMAIL` ni `VITE_DEMO_PASSWORD`.
5. Publica de nuevo después de cargar las variables, porque se incrustan al compilar. Revisa que la pantalla de entrada no diga "Demo" y que tenga el botón de Google.

## 9. Comprobar antes del primer paciente

- [ ] Ella entra con Google desde su celular y la instala como app.
- [ ] Tú entras con Google.
- [ ] En Ajustes cargan sus lugares, horarios y, si hace falta, las socias.
- [ ] **Actions → Respaldo de producción → Run workflow** termina bien.
- [ ] Un respaldo se restaura en local (ver abajo).
- [ ] Ella mide la latencia desde su celular y la red del consultorio, por ejemplo con <https://www.cloudping.info> (0016 y 0030).

## Cada vez que se publica algo nuevo

Haz el merge a `main` (eso actualiza la demo) y después corre **Publicar en producción**.

## Cada mes: probar un respaldo

1. Descarga de Drive el respaldo más reciente de `sifel-respaldos/base/`.
2. Con el Supabase local levantado, corre:

   ```sh
   scripts/probar-respaldo.sh base-AAAA-MM-DD.tar.gz.age ruta/a/sifel-respaldo-<nombre>.txt
   ```

3. Revisa en `pnpm dev` que se vean la agenda, un paciente y sus pagos.
4. Corre `pnpm db:reset` para borrar los datos reales de tu computadora.
5. Borra el archivo descargado.

Si el respaldo es de una migración más vieja que tu checkout, el script lo avisa. En ese caso, haz checkout del commit con esa migración antes de restaurar.
