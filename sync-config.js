// ============================================================
// CONFIGURACIÓN DE SINCRONIZACIÓN
// ============================================================
// Rellena esto con tus propios datos de Firebase para que la app
// sincronice tus datos (ideas, pesos, registros de natación, titular
// de la home) entre todos tus dispositivos.
//
// Si lo dejas vacío tal cual está, la app sigue funcionando igual
// que antes: 100% local en ese dispositivo, sin sincronizar.
//
// Cómo conseguir estos datos (gratis, ~5 minutos, sin tarjeta):
//
// 1. Ve a https://console.firebase.google.com y crea un proyecto
//    (el nombre no importa).
// 2. En el menú lateral: Compilación → Firestore Database →
//    "Crear base de datos". Elige modo producción y cualquier región.
// 3. Dentro de Firestore, pestaña "Reglas", sustituye el contenido por
//    esto y pulsa "Publicar":
//
//      rules_version = '2';
//      service cloud.firestore {
//        match /databases/{database}/documents {
//          match /syncs/{code} {
//            allow read, write: if true;
//          }
//        }
//      }
//
//    (Esto abre solo la colección "syncs"; cada dispositivo lee y
//    escribe únicamente el documento de SU código de sincronización,
//    que hace de contraseña — nadie puede adivinar tus datos sin
//    conocer ese código de 8 caracteres.)
//
// 4. Rueda dentada (arriba a la izquierda) → "Configuración del
//    proyecto" → pestaña "General" → sección "Tus apps" → icono
//    "</>" para añadir una app web. Ponle el nombre que quieras y
//    pulsa "Registrar app".
// 5. Te mostrará un bloque de código con "apiKey" y "projectId".
//    Copia esos dos valores exactamente y pégalos aquí abajo, entre
//    comillas:

const SYNC_CONFIG = {
  firebaseProjectId: "",
  firebaseApiKey: "",
};
