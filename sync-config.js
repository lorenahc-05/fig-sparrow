// ============================================================
// CONFIGURACIÓN DE SINCRONIZACIÓN (Supabase)
// ============================================================
// Rellena esto con los datos de tu proyecto de Supabase para que la
// app sincronice tus datos (ideas, pesos, registros de natación,
// titular de la home) entre todos tus dispositivos.
//
// Si lo dejas vacío tal cual está, la app sigue funcionando igual
// que antes: 100% local en ese dispositivo, sin sincronizar.
//
// Cómo conseguirlo (~5 minutos):
//
// 1. En tu proyecto de Supabase (uno nuevo o uno que ya tengas), ve
//    al "SQL Editor" y ejecuta esto para crear la tabla:
//
//      create table syncs (
//        code text primary key,
//        data jsonb not null,
//        updated_at bigint not null
//      );
//
//      alter table syncs enable row level security;
//
//      create policy "acceso publico por codigo"
//        on syncs for all
//        using (true)
//        with check (true);
//
//    (La tabla solo guarda lo que hay bajo el "código de
//    sincronización" de 8 caracteres de cada grupo de dispositivos,
//    que hace de contraseña — nadie puede tocar tus datos sin
//    conocer ese código. La política de arriba abre la tabla al
//    "anon key" público, que es la forma normal de usar Supabase
//    desde el navegador sin backend propio.)
//
// 2. Ve a Project Settings → API. Copia la "Project URL" y la clave
//    "anon public" y pégalas aquí abajo, entre comillas:

const SYNC_CONFIG = {
  supabaseUrl: "https://stjbtjnmywujdmrpkqoq.supabase.co/rest/v1/",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0amJ0am5teXd1amRtcnBrcW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzODQzNDYsImV4cCI6MjEwNDk2MDM0Nn0.-4TKEv-Koe70oQNaL0-4as6kWC7dat4y8iSGCiC2dFE",
};