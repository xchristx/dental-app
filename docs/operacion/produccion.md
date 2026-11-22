# Producción: guía paso a paso

Cómo se arma producción (decisiones [0030](../decisiones/0030-produccion.md) y [0031](../decisiones/0031-respaldos-en-google-drive.md)) y qué se hace cada mes. Todo pasa en paneles externos: el repositorio solo tiene los workflows, la plantilla del alta y el script de restauración.

> Nada de lo que se completa en esta guía (contraseñas, claves, correos, nombres) va al repositorio, porque es público.

En la guía, `<ref>` es la referencia del proyecto de Supabase (sale en su URL). Producción va en `sifel.netlify.app` y la demo en `sifel-demo.netlify.app` (0030).

## 0. Antes de empezar

### 0.1 La cuenta de Google de Sifel

Es una cuenta de Google solo para Sifel. Es dueña de lo de Sifel en Supabase, del cliente OAuth de Google Cloud (paso 3) y de la carpeta de respaldos en Drive (paso 4). Así nada de eso se mezcla con tus otros proyectos.

1. Créala en <https://accounts.google.com/signup>, con un correo nuevo de Gmail.
2. Activa la verificación en dos pasos. Pon tu teléfono y tu correo personal como recuperación.
3. Guarda la contraseña en tu gestor de contraseñas.

Para entrar a la app, la dentista y tú siguen usando sus propias cuentas de Google. Esta cuenta solo administra.

### 0.2 Supabase: una cuenta aparte, con la demo transferida

El cupo de 2 proyectos gratis activos es por persona (0016). Con una cuenta aparte, Sifel no choca con tus otros proyectos.

1. Crea una cuenta de Supabase en <https://supabase.com/dashboard/sign-up>, con el correo de Sifel (correo y contraseña). Activa MFA en **Account → Security**.
2. Con esa cuenta, crea una organización `Sifel`, en el plan Free.
3. En **Organization settings → Team**, invita a tu cuenta personal de Supabase como **Owner**. Solo hace falta para transferir.
4. Con tu cuenta personal:
   - Acepta la invitación.
   - En el proyecto `dental-app-demo-sa`, entra a **Project Settings → General → Transfer project** y elige la organización `Sifel`.
   - La transferencia no se puede deshacer, pero el proyecto **conserva su URL y sus claves**. Netlify, el secreto `DEMO_DB_URL` y el workflow de reinicio no cambian.
5. Con la cuenta de Sifel, en **Team**, saca a tu cuenta personal o déjala como **Developer**. Si queda como Owner o Admin, el proyecto sigue contando en tu cupo personal.
6. En tu computadora, corre `pnpm exec supabase login` con la cuenta de Sifel, para que la CLI vea los proyectos.

### 0.3 Mover la demo a sifel-demo.netlify.app

Haz los pasos 1 y 2 seguidos. Los nombres de Netlify son únicos entre todos sus usuarios: apenas se libera `sifel`, otra persona podría tomarlo.

1. En Netlify, abre el sitio actual (`sifel`) y ve a **Site configuration → General → Site details → Change site name**. Ponle `sifel-demo`. La demo sigue funcionando igual, con sus variables y publicando `main`, pero en la dirección nueva. La vieja deja de responder.
2. Reserva `sifel` con un sitio provisorio:
   - En **Add new site → Deploy manually**, arrastra la carpeta `docs/operacion/provisorio/`, que tiene una sola página que dice "Pronto".
   - En el sitio nuevo, **Change site name** → `sifel`.
   - En el paso 8 se le conecta el repositorio.
3. En Supabase, en el proyecto de la demo (`dental-app-demo-sa`), entra a **Authentication → URL Configuration**:
   - **Site URL:** `https://sifel-demo.netlify.app`
   - **Redirect URLs:** `https://sifel-demo.netlify.app/**`
4. Cambia los enlaces a la demo que tengas afuera (portafolio, CV, mensajes).

El workflow "Reiniciar la demo" ya comprueba `sifel-demo.netlify.app`. Hasta que se mergee este cambio, su último paso va a fallar: el reinicio se hace igual, y solo falla la comprobación final.

## 1. Las claves de los respaldos

Cada uno (el autor y la dentista) tiene su par de claves de [age](https://age-encryption.org).

1. Instala age: `scoop install age` o `winget install FiloSottile.age`.
2. Corre `age-keygen -o sifel-respaldo-<nombre>.txt`, una vez por persona.
3. Copia las dos líneas `# public key: age1...`. Esas son las **claves públicas**.
4. Guarda cada archivo, que tiene la **clave privada**, donde lo guarde su dueño: un gestor de contraseñas, más una copia en papel o en un USB. No va a GitHub ni a Drive. Si se pierden las dos, los respaldos no se pueden abrir.

## 2. Supabase: el proyecto

1. Con la cuenta de Sifel, crea un proyecto en la organización `Sifel`.
   - **Nombre:** `sifel-prod`.
   - **Región:** South America (São Paulo), sa-east-1.
   - Pon una contraseña de base larga y guárdala en el gestor de contraseñas.
2. En **Authentication → Sign In / Providers**:
   - Apaga **Allow new users to sign up**. Es obligatorio: sin esto, cualquiera con una cuenta de Google podría crear un usuario.
   - Deja apagado **Allow anonymous sign-ins**.
3. En **Authentication → URL Configuration**:
   - **Site URL:** `https://sifel.netlify.app`
   - **Redirect URLs:** `https://sifel.netlify.app/**`
4. En **Storage → S3 Configuration**, crea una **access key**. Se muestra una sola vez: guarda el *Access key ID* y el *Secret access key* para el paso 5.

## 3. Google: el cliente OAuth

En [Google Cloud Console](https://console.cloud.google.com), con la cuenta de Google de Sifel:

1. Crea un proyecto llamado `Sifel`.
2. En **Google Auth Platform**:
   - **Branding:** nombre de la app `Sifel` y el correo de Sifel como correo de soporte. Es el que ve la dentista en la pantalla de Google.
   - **Audience:** External. Después, **Publish app** para que quede *In production*. Con solo los permisos básicos (email y perfil) no pide verificación.
   - **Clients → Create client → Web application:**
     - **Authorized JavaScript origins:** `https://sifel.netlify.app`
     - **Authorized redirect URIs:** `https://<ref>.supabase.co/auth/v1/callback`
3. Copia el **Client ID** y el **Client secret**.
4. En Supabase, **Authentication → Sign In / Providers → Google**: actívalo y pega los dos valores.

## 4. Google Drive: dónde quedan los respaldos

1. Instala rclone: `scoop install rclone` o `winget install Rclone.Rclone`.
2. Corre `rclone config create drive drive scope drive.file`. Se abre el navegador: entra con la cuenta de Google de Sifel.
3. Corre `rclone config show drive` y copia todo lo que imprime, desde la línea `[drive]`. Es el secreto `RCLONE_DRIVE_CONF` del paso 5.

Con `drive.file`, rclone solo ve lo que sube él: la carpeta `sifel-respaldos`. Para descargar un respaldo (prueba mensual), entra a Drive con la cuenta de Sifel.

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

Se usa el sitio `sifel` que se reservó en el paso 0.

1. **Primero las variables,** para que el primer build ya las tenga: se incrustan al compilar. En **Site configuration → Environment variables** carga:
   - `VITE_SUPABASE_URL=https://<ref>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=` la clave *publishable*
   - `VITE_ES_DEMO=false`
   - `VITE_GOOGLE_HABILITADO=true`

   Sin `VITE_DEMO_EMAIL` ni `VITE_DEMO_PASSWORD`.
2. En **Site configuration → Build & deploy → Continuous deployment → Link repository**, conecta el mismo repositorio de GitHub.
   - **Branch to deploy:** `produccion`, que la creó el paso 6. La demo sigue publicando `main`.
   - **Build settings:** los mismos que el sitio `sifel-demo` (copia el comando y el directorio base). Directorio de publicación: `apps/web/dist`.
3. Cuando termine el build, abre <https://sifel.netlify.app>. La pantalla de entrada no tiene que decir "Demo" y tiene que mostrar el botón de Google.

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
