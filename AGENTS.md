# GO Workout Mobile — Contexto para Codex

## Base de datos (Supabase)

**Proyecto:** go-workoutDB  
**Ref:** oydiorqnrwvfzldnayvq  
**Region:** West US (Oregon)

### Ejecutar migraciones

El CLI de Supabase tiene sesión activa y el proyecto está linkeado. Para correr una migración:

```bash
# Archivo individual
npx supabase db query --linked -f supabase/migrations/008_add_avatar_and_storage.sql

# Query directo
npx supabase db query --linked "SELECT * FROM profiles LIMIT 5;"
```

> **Nota:** No requiere Docker. Usa la sesión del CLI local (`~/.supabase/`).  
> Si la sesión expira: `npx supabase login`

### Verificar estado de tablas

```bash
npx supabase db query --linked "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

## Jira

**Proyecto:** GOW (No excuses Team)  
**URL:** https://jneira031.atlassian.net  
**Config:** ~/.config/.jira/.config.yml

## Stack

- React Native + Expo SDK 52
- Supabase (Auth, DB, Storage)
- NativeWind (Tailwind)
- TypeScript
- Expo Router (file-based routing)
